import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ConnectionPrincipal } from "eve/connections";
import { z } from "zod";
import { BRAIN_AUTH_ISSUER } from "@/lib/auth/principal";
import { getProviderCredentialSetupError } from "./connection-credentials";
import {
  authorizeUrlPath,
  buildAuthorizeUrl,
  deleteStoredToken,
  exchangeAuthorizationCode,
  generateOAuthState,
  makePkce,
  storeAccessToken,
  verifyOAuthState,
  type McpOAuthProvider,
} from "./mcp-oauth";

const pendingAuthorizationSchema = z
  .object({
    verifier: z.string().min(1),
    clientId: z.string().min(1),
    clientSecret: z.string().min(1).optional(),
    state: z.string().min(1),
    callbackUrl: z.string().url(),
    createdAt: z.number().finite(),
    principalId: z.string().min(1),
    principalIssuer: z.string().min(1).default(BRAIN_AUTH_ISSUER),
  })
  .strict();

export type PendingMenuAuthorization = z.infer<typeof pendingAuthorizationSchema>;

export type MenuAuthorizeStartResult = {
  readonly authorizeUrl: string;
  readonly callbackUrl: string;
  readonly displayName: string;
};

export type MenuAuthorizeCompleteResult =
  | { readonly ok: true; readonly displayName: string }
  | { readonly ok: false; readonly error: string; readonly retryable: boolean };

function pendingPath(name: string): string {
  return path.join(process.cwd(), ".eve", `mcp-oauth-pending-${name}.json`);
}

async function writePending(name: string, pending: PendingMenuAuthorization): Promise<void> {
  const file = pendingPath(name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(pending, null, 2)}\n`, "utf8");
}

async function readPending(name: string): Promise<PendingMenuAuthorization | null> {
  try {
    const raw = await readFile(pendingPath(name), "utf8");
    const parsed: unknown = JSON.parse(raw);
    const result = pendingAuthorizationSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

async function clearPending(name: string): Promise<void> {
  await rm(pendingPath(name), { force: true });
}

/** Write redirect URI hint without opening a system browser (UI opens the URL). */
async function writeMenuAuthorizeHint(
  provider: McpOAuthProvider,
  authorizeUrl: string,
  callbackUrl: string,
): Promise<void> {
  const file = authorizeUrlPath(provider.name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(
    file,
    [
      authorizeUrl,
      "",
      `# Menu Connect redirect URI — add this exact URI to your ${provider.displayName} OAuth app:`,
      callbackUrl,
      "",
    ].join("\n"),
    "utf8",
  );
}

export async function startMenuConnectionAuthorization(
  provider: McpOAuthProvider,
  callbackUrl: string,
  principal: Extract<ConnectionPrincipal, { readonly type: "user" }>,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<MenuAuthorizeStartResult> {
  const setupError = await getProviderCredentialSetupError(provider, env);
  if (setupError) {
    throw new Error(setupError);
  }

  const { verifier, challenge } = makePkce();
  const state = generateOAuthState();
  const { url, clientId, clientSecret } = await buildAuthorizeUrl(provider, {
    callbackUrl,
    codeChallenge: challenge,
    state,
  });

  await writePending(provider.name, {
    verifier,
    clientId,
    clientSecret,
    state,
    callbackUrl,
    createdAt: Date.now(),
    principalId: principal.id,
    principalIssuer: principal.issuer ?? BRAIN_AUTH_ISSUER,
  });
  await writeMenuAuthorizeHint(provider, url, callbackUrl);

  return {
    authorizeUrl: url,
    callbackUrl,
    displayName: provider.displayName,
  };
}

export async function completeMenuConnectionAuthorization(
  provider: McpOAuthProvider,
  params: Readonly<Record<string, string>>,
): Promise<MenuAuthorizeCompleteResult> {
  const pending = await readPending(provider.name);
  if (!pending) {
    return { ok: false, error: "No pending sign-in for this connection.", retryable: true };
  }

  const principal: ConnectionPrincipal = {
    type: "user",
    id: pending.principalId,
    issuer: pending.principalIssuer,
  };

  if (params.error) {
    await clearPending(provider.name);
    const accessDenied = params.error === "access_denied";
    return {
      ok: false,
      error: accessDenied ? "Sign-in was denied." : `Sign-in failed (${params.error}).`,
      retryable: !accessDenied,
    };
  }

  if (!verifyOAuthState(pending.state, params.state)) {
    await clearPending(provider.name);
    return { ok: false, error: "Sign-in state mismatch. Try Connect again.", retryable: true };
  }

  const code = params.code;
  if (!code) {
    await clearPending(provider.name);
    return { ok: false, error: "Missing authorization code.", retryable: true };
  }

  try {
    const token = await exchangeAuthorizationCode(provider, {
      callbackUrl: pending.callbackUrl,
      code,
      codeVerifier: pending.verifier,
      clientId: pending.clientId,
      clientSecret: pending.clientSecret,
    });
    await storeAccessToken(provider, principal, token);
    await clearPending(provider.name);
    return { ok: true, displayName: provider.displayName };
  } catch {
    await clearPending(provider.name);
    return { ok: false, error: "Could not finish sign-in. Try Connect again.", retryable: true };
  }
}

export function menuConnectionCallbackUrl(origin: string, connectionId: string): string {
  return new URL(`/api/connections/${connectionId}/callback`, origin).toString();
}

/** Clear the signed-in principal token (and any pending menu OAuth) for a connection. */
export async function disconnectMenuConnection(
  provider: McpOAuthProvider,
  principal: Extract<ConnectionPrincipal, { readonly type: "user" }>,
): Promise<{ readonly displayName: string }> {
  await deleteStoredToken(provider, principal);
  await clearPending(provider.name);
  return { displayName: provider.displayName };
}
