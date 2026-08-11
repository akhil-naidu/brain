import type { ModelMessage } from "ai";
import type { ConnectionPrincipal } from "eve/connections";
import type { SandboxNetworkPolicy, SandboxSession } from "eve/sandbox";
import { githubProvider } from "@/agent/connections/github";
import { extractAttachedRepoFromMessages } from "@/agent/lib/client-context-model";
import { getStoredAccessToken } from "@/agent/lib/mcp-oauth";
import {
  attachedRepoCloneUrl,
  formatAttachedRepo,
  type AttachedRepo,
} from "@/lib/chat/attached-repo";

export const ATTACHED_REPO_MARKER = ".brain-repo";

function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function githubBasicAuthorization(token: string): string {
  return `Basic ${Buffer.from(`x-access-token:${token}`, "utf8").toString("base64")}`;
}

function commandFailed(result: {
  readonly exitCode?: number;
  readonly stderr?: string;
  readonly stdout?: string;
}): boolean {
  return typeof result.exitCode === "number" ? result.exitCode !== 0 : false;
}

function commandDetail(result: { readonly stderr?: string; readonly stdout?: string }): string {
  return (result.stderr || result.stdout || "unknown error").trim();
}

export function connectionPrincipalFromSessionAuth(auth: {
  readonly principalId?: string | null;
  readonly principalType?: string | null;
  readonly issuer?: string | null;
}): ConnectionPrincipal | null {
  if (auth.principalType !== "user" || !auth.principalId?.trim()) {
    return null;
  }
  return {
    type: "user",
    id: auth.principalId.trim(),
    ...(auth.issuer ? { issuer: auth.issuer } : {}),
  };
}

export async function githubNetworkPolicyForPrincipal(
  principal: ConnectionPrincipal | null,
): Promise<SandboxNetworkPolicy> {
  const token = principal ? await getStoredAccessToken(githubProvider, principal) : null;
  const githubAllow =
    token?.token != null && token.token.length > 0
      ? [{ transform: [{ headers: { authorization: githubBasicAuthorization(token.token) } }] }]
      : [];

  const policy: SandboxNetworkPolicy = {
    allow: {
      "github.com": githubAllow,
      "*.github.com": [],
      "api.github.com": githubAllow,
      "githubusercontent.com": [],
      "*.githubusercontent.com": [],
      "*": [],
    },
  };
  return policy;
}

async function readMarker(sandbox: SandboxSession): Promise<string | null> {
  try {
    const content = await sandbox.readTextFile({ path: ATTACHED_REPO_MARKER });
    if (content == null) {
      return null;
    }
    const trimmed = content.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

async function clearWorkspace(sandbox: SandboxSession): Promise<void> {
  const result = await sandbox.run({
    command: "find /workspace -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null; true",
  });
  if (commandFailed(result)) {
    throw new Error(`Failed to clear sandbox workspace before clone: ${commandDetail(result)}`);
  }
}

/**
 * Shallow-clone the attached repo into `/workspace` when needed.
 * No-ops when no repo is attached or the marker already matches.
 */
export async function ensureAttachedRepoCloned(input: {
  readonly messages: readonly ModelMessage[];
  readonly sandbox: SandboxSession;
  readonly principal?: ConnectionPrincipal | null;
}): Promise<AttachedRepo | null> {
  const repo = extractAttachedRepoFromMessages(input.messages);
  if (!repo) {
    return null;
  }

  const expected = formatAttachedRepo(repo);
  const existing = await readMarker(input.sandbox);
  if (existing === expected) {
    return repo;
  }

  const principal = input.principal ?? null;

  try {
    await input.sandbox.setNetworkPolicy(await githubNetworkPolicyForPrincipal(principal));
  } catch {
    // Backend may not support mid-session policy updates (e.g. just-bash).
  }

  await clearWorkspace(input.sandbox);

  const cloneUrl = attachedRepoCloneUrl(repo);
  const branchArgs = repo.ref ? `--branch ${shellSingleQuote(repo.ref)} ` : "";
  const clone = await input.sandbox.run({
    command: `git clone --depth 1 ${branchArgs}${shellSingleQuote(cloneUrl)} /workspace`,
  });

  if (commandFailed(clone)) {
    const detail = commandDetail(clone) || "git clone failed";
    const hint =
      /Authentication|403|404|not found|could not read Username/i.test(detail) && !principal
        ? " Connect GitHub in Tools if this is a private repository."
        : /Authentication|403|could not read Username/i.test(detail)
          ? " Connect or reconnect GitHub in Tools for private repository access."
          : "";
    throw new Error(`Could not clone ${expected}: ${detail}.${hint}`);
  }

  await input.sandbox.writeTextFile({
    path: ATTACHED_REPO_MARKER,
    content: `${expected}\n`,
  });

  return repo;
}

export function principalForSandboxAuth(auth: {
  readonly current: {
    readonly principalId?: string | null;
    readonly principalType?: string | null;
    readonly issuer?: string | null;
  } | null;
  readonly initiator: {
    readonly principalId?: string | null;
    readonly principalType?: string | null;
    readonly issuer?: string | null;
  } | null;
}): ConnectionPrincipal | null {
  const source = auth.current ?? auth.initiator;
  if (!source) {
    return null;
  }
  return connectionPrincipalFromSessionAuth(source);
}
