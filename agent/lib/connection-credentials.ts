import { chmod, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { McpOAuthProvider } from "./mcp-oauth";

const EVE_SNAPSHOT_MARKER = `${path.sep}.eve${path.sep}dev-runtime${path.sep}snapshots${path.sep}`;

/**
 * Eve may load connection modules with cwd inside a snapshot under
 * `.eve/dev-runtime/snapshots/...`. Host credentials live on the real project
 * root `.eve/`, so walk out of the snapshot when needed.
 */
export function resolveEveDataRoot(cwd: string = process.cwd()): string {
  if (!cwd.includes(EVE_SNAPSHOT_MARKER)) {
    return cwd;
  }

  let dir = cwd;
  while (dir.includes(EVE_SNAPSHOT_MARKER)) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      return cwd;
    }
    dir = parent;
  }

  for (;;) {
    if (existsSync(path.join(dir, "package.json")) && existsSync(path.join(dir, ".eve"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return cwd;
    }
    dir = parent;
  }
}

export function providerUsesPatAuth(
  provider: Pick<McpOAuthProvider, "authKind" | "patTokenEnv">,
): boolean {
  return provider.authKind === "pat" || Boolean(provider.patTokenEnv);
}

const storedAppCredentialsSchema = z
  .object({
    clientId: z.string().min(1).optional(),
    clientSecret: z.string().min(1).optional(),
    /** Programmatic Access Token / static bearer (e.g. Snowflake PAT). */
    accessToken: z.string().min(1).optional(),
    /** Account-specific MCP server URL (e.g. Snowflake). */
    mcpUrl: z.string().url().optional(),
    updatedAt: z.number().finite(),
  })
  .strict()
  .refine((value) => Boolean(value.clientId || value.accessToken), {
    message: "clientId or accessToken is required",
  });

export type StoredAppCredentials = z.infer<typeof storedAppCredentialsSchema>;

export type ResolvedAppCredentials = {
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly accessToken?: string;
  readonly mcpUrl?: string;
  readonly source: "stored" | "env";
};

function credentialsPath(name: string): string {
  return path.join(resolveEveDataRoot(), ".eve", `mcp-app-credentials-${name}.json`);
}

/** True when the provider needs a pre-registered OAuth app (not DCR). */
export function providerNeedsStaticAppCredentials(
  provider: Pick<
    McpOAuthProvider,
    "clientIdEnv" | "registrationEndpoint" | "authKind" | "patTokenEnv"
  >,
): boolean {
  if (providerUsesPatAuth(provider)) {
    return false;
  }
  return Boolean(provider.clientIdEnv) && !provider.registrationEndpoint;
}

/** True when Set up should collect host credentials (OAuth app and/or PAT). */
export function providerNeedsCredentialSetup(
  provider: Pick<
    McpOAuthProvider,
    "clientIdEnv" | "registrationEndpoint" | "authKind" | "patTokenEnv"
  >,
): boolean {
  return providerNeedsStaticAppCredentials(provider) || providerUsesPatAuth(provider);
}

export async function readStoredAppCredentials(
  connectionId: string,
): Promise<StoredAppCredentials | null> {
  try {
    const raw = await readFile(credentialsPath(connectionId), "utf8");
    const parsed = storedAppCredentialsSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    return null;
  }
}

export async function writeStoredAppCredentials(
  connectionId: string,
  input: {
    readonly clientId?: string;
    readonly clientSecret?: string;
    readonly accessToken?: string;
    readonly mcpUrl?: string;
  },
): Promise<StoredAppCredentials> {
  const existing = await readStoredAppCredentials(connectionId);
  // Blank fields keep the previously saved value so reconfigure can change
  // only MCP URL / client id without re-pasting secrets.
  const clientId = input.clientId?.trim() || existing?.clientId;
  const clientSecret = input.clientSecret?.trim() || existing?.clientSecret;
  const accessToken = input.accessToken?.trim() || existing?.accessToken;
  const mcpUrl = input.mcpUrl?.trim() || existing?.mcpUrl;

  if (!clientId && !accessToken) {
    throw new Error("Client ID or access token is required.");
  }
  if (mcpUrl && !URL.canParse(mcpUrl)) {
    throw new Error("MCP server URL must be a valid http(s) URL.");
  }
  if (mcpUrl && !/^https?:\/\//i.test(mcpUrl)) {
    throw new Error("MCP server URL must start with http:// or https://.");
  }

  const value: StoredAppCredentials = {
    ...(clientId ? { clientId } : {}),
    ...(clientSecret ? { clientSecret } : {}),
    ...(accessToken ? { accessToken } : {}),
    ...(mcpUrl ? { mcpUrl } : {}),
    updatedAt: Date.now(),
  };

  const destination = credentialsPath(connectionId);
  const directory = path.dirname(destination);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);

  const temporary = path.join(
    directory,
    `.${path.basename(destination)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
  );
  try {
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, destination);
    await chmod(destination, 0o600);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }

  return value;
}

export async function deleteStoredAppCredentials(connectionId: string): Promise<void> {
  await rm(credentialsPath(connectionId), { force: true });
}

function credentialsFromEnv(
  provider: Pick<McpOAuthProvider, "clientIdEnv" | "clientSecretEnv" | "mcpUrlEnv" | "patTokenEnv">,
  env: { readonly [key: string]: string | undefined },
): ResolvedAppCredentials | null {
  const accessToken = provider.patTokenEnv
    ? env[provider.patTokenEnv]?.trim() || undefined
    : undefined;
  const clientId = provider.clientIdEnv ? env[provider.clientIdEnv]?.trim() : undefined;
  if (!clientId && !accessToken) {
    return null;
  }
  const clientSecret = provider.clientSecretEnv
    ? env[provider.clientSecretEnv]?.trim() || undefined
    : undefined;
  const mcpUrl = provider.mcpUrlEnv ? env[provider.mcpUrlEnv]?.trim() || undefined : undefined;
  return { clientId, clientSecret, accessToken, mcpUrl, source: "env" };
}

/** Prefer UI-stored app credentials, then process env. */
export async function resolveProviderAppCredentials(
  provider: Pick<
    McpOAuthProvider,
    "name" | "clientIdEnv" | "clientSecretEnv" | "mcpUrlEnv" | "patTokenEnv"
  >,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<ResolvedAppCredentials | null> {
  const stored = await readStoredAppCredentials(provider.name);
  if (stored?.clientId || stored?.accessToken) {
    return {
      clientId: stored.clientId,
      clientSecret: stored.clientSecret,
      accessToken:
        stored.accessToken ??
        (provider.patTokenEnv ? env[provider.patTokenEnv]?.trim() || undefined : undefined),
      mcpUrl: stored.mcpUrl ?? (provider.mcpUrlEnv ? env[provider.mcpUrlEnv]?.trim() : undefined),
      source: "stored",
    };
  }
  return credentialsFromEnv(provider, env);
}

/**
 * Resolve an account-specific MCP URL: UI-stored first, then env.
 * Sync variant for provider construction (status / authorize).
 */
export function resolveProviderMcpUrlSync(
  provider: Pick<McpOAuthProvider, "name" | "mcpUrlEnv">,
  env: { readonly [key: string]: string | undefined } = process.env,
): string | null {
  try {
    const raw = readFileSync(credentialsPath(provider.name), "utf8");
    const parsed: unknown = JSON.parse(raw);
    const result = storedAppCredentialsSchema.safeParse(parsed);
    if (result.success && result.data.mcpUrl?.trim()) {
      return result.data.mcpUrl.trim();
    }
  } catch {
    // Missing or corrupt store — fall through to env.
  }
  const fromEnv = provider.mcpUrlEnv ? env[provider.mcpUrlEnv]?.trim() : undefined;
  return fromEnv || null;
}

/** Resolve PAT / bearer token: UI-stored first, then env. */
export function resolveProviderPatTokenSync(
  provider: Pick<McpOAuthProvider, "name" | "patTokenEnv">,
  env: { readonly [key: string]: string | undefined } = process.env,
): string | null {
  try {
    const raw = readFileSync(credentialsPath(provider.name), "utf8");
    const parsed: unknown = JSON.parse(raw);
    const result = storedAppCredentialsSchema.safeParse(parsed);
    if (result.success && result.data.accessToken?.trim()) {
      return result.data.accessToken.trim();
    }
  } catch {
    // Missing or corrupt store — fall through to env.
  }
  const fromEnv = provider.patTokenEnv ? env[provider.patTokenEnv]?.trim() : undefined;
  return fromEnv || null;
}

export async function getProviderCredentialSetupError(
  provider: Pick<
    McpOAuthProvider,
    | "name"
    | "displayName"
    | "clientIdEnv"
    | "clientSecretEnv"
    | "mcpUrlEnv"
    | "patTokenEnv"
    | "authKind"
    | "registrationEndpoint"
    | "tokenAuthMethod"
  >,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<string | null> {
  if (provider.mcpUrlEnv && !resolveProviderMcpUrlSync(provider, env)) {
    return `Set up ${provider.displayName} with your MCP server URL`;
  }

  if (providerUsesPatAuth(provider)) {
    if (!resolveProviderPatTokenSync(provider, env)) {
      return `Set up ${provider.displayName} with your Programmatic Access Token`;
    }
    return null;
  }

  if (!providerNeedsStaticAppCredentials(provider)) {
    return null;
  }

  const credentials = await resolveProviderAppCredentials(provider, env);
  if (!credentials?.clientId) {
    return `Set up ${provider.displayName} to continue`;
  }

  if (
    provider.tokenAuthMethod === "client_secret_post" &&
    provider.clientSecretEnv &&
    !credentials.clientSecret
  ) {
    return `Add the ${provider.displayName} app secret to continue`;
  }

  return null;
}

export function connectionCallbackPath(connectionId: string): string {
  return `/api/connections/${connectionId}/callback`;
}
