import { chmod, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { McpOAuthProvider } from "./mcp-oauth";

const storedAppCredentialsSchema = z
  .object({
    clientId: z.string().min(1),
    clientSecret: z.string().min(1).optional(),
    /** Account-specific MCP server URL (e.g. Snowflake). */
    mcpUrl: z.string().url().optional(),
    updatedAt: z.number().finite(),
  })
  .strict();

export type StoredAppCredentials = z.infer<typeof storedAppCredentialsSchema>;

export type ResolvedAppCredentials = {
  readonly clientId: string;
  readonly clientSecret?: string;
  readonly mcpUrl?: string;
  readonly source: "stored" | "env";
};

function credentialsPath(name: string): string {
  return path.join(process.cwd(), ".eve", `mcp-app-credentials-${name}.json`);
}

/** True when the provider needs a pre-registered OAuth app (not DCR). */
export function providerNeedsStaticAppCredentials(
  provider: Pick<McpOAuthProvider, "clientIdEnv" | "registrationEndpoint">,
): boolean {
  return Boolean(provider.clientIdEnv) && !provider.registrationEndpoint;
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
    readonly clientId: string;
    readonly clientSecret?: string;
    readonly mcpUrl?: string;
  },
): Promise<StoredAppCredentials> {
  const clientId = input.clientId.trim();
  if (!clientId) {
    throw new Error("Client ID is required.");
  }
  const clientSecret = input.clientSecret?.trim();
  const mcpUrl = input.mcpUrl?.trim();
  if (mcpUrl && !URL.canParse(mcpUrl)) {
    throw new Error("MCP server URL must be a valid http(s) URL.");
  }
  if (mcpUrl && !/^https?:\/\//i.test(mcpUrl)) {
    throw new Error("MCP server URL must start with http:// or https://.");
  }
  const value: StoredAppCredentials = {
    clientId,
    ...(clientSecret ? { clientSecret } : {}),
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
  provider: Pick<McpOAuthProvider, "clientIdEnv" | "clientSecretEnv" | "mcpUrlEnv">,
  env: { readonly [key: string]: string | undefined },
): ResolvedAppCredentials | null {
  const clientId = provider.clientIdEnv ? env[provider.clientIdEnv]?.trim() : undefined;
  if (!clientId) {
    return null;
  }
  const clientSecret = provider.clientSecretEnv
    ? env[provider.clientSecretEnv]?.trim() || undefined
    : undefined;
  const mcpUrl = provider.mcpUrlEnv ? env[provider.mcpUrlEnv]?.trim() || undefined : undefined;
  return { clientId, clientSecret, mcpUrl, source: "env" };
}

/** Prefer UI-stored app credentials, then process env. */
export async function resolveProviderAppCredentials(
  provider: Pick<McpOAuthProvider, "name" | "clientIdEnv" | "clientSecretEnv" | "mcpUrlEnv">,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<ResolvedAppCredentials | null> {
  const stored = await readStoredAppCredentials(provider.name);
  if (stored?.clientId) {
    return {
      clientId: stored.clientId,
      clientSecret: stored.clientSecret,
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

export async function getProviderCredentialSetupError(
  provider: Pick<
    McpOAuthProvider,
    | "name"
    | "displayName"
    | "clientIdEnv"
    | "clientSecretEnv"
    | "mcpUrlEnv"
    | "registrationEndpoint"
    | "tokenAuthMethod"
  >,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<string | null> {
  if (provider.mcpUrlEnv && !resolveProviderMcpUrlSync(provider, env)) {
    return `Set up ${provider.displayName} with your MCP server URL`;
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
