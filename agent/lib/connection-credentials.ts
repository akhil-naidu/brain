import { chmod, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { McpOAuthProvider } from "./mcp-oauth";

const storedAppCredentialsSchema = z
  .object({
    clientId: z.string().min(1),
    clientSecret: z.string().min(1).optional(),
    updatedAt: z.number().finite(),
  })
  .strict();

export type StoredAppCredentials = z.infer<typeof storedAppCredentialsSchema>;

export type ResolvedAppCredentials = {
  readonly clientId: string;
  readonly clientSecret?: string;
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
  input: { readonly clientId: string; readonly clientSecret?: string },
): Promise<StoredAppCredentials> {
  const clientId = input.clientId.trim();
  if (!clientId) {
    throw new Error("Client ID is required.");
  }
  const clientSecret = input.clientSecret?.trim();
  const value: StoredAppCredentials = {
    clientId,
    ...(clientSecret ? { clientSecret } : {}),
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
  provider: Pick<McpOAuthProvider, "clientIdEnv" | "clientSecretEnv">,
  env: { readonly [key: string]: string | undefined },
): ResolvedAppCredentials | null {
  const clientId = provider.clientIdEnv ? env[provider.clientIdEnv]?.trim() : undefined;
  if (!clientId) {
    return null;
  }
  const clientSecret = provider.clientSecretEnv
    ? env[provider.clientSecretEnv]?.trim() || undefined
    : undefined;
  return { clientId, clientSecret, source: "env" };
}

/** Prefer UI-stored app credentials, then process env. */
export async function resolveProviderAppCredentials(
  provider: Pick<McpOAuthProvider, "name" | "clientIdEnv" | "clientSecretEnv">,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<ResolvedAppCredentials | null> {
  const stored = await readStoredAppCredentials(provider.name);
  if (stored?.clientId) {
    return {
      clientId: stored.clientId,
      clientSecret: stored.clientSecret,
      source: "stored",
    };
  }
  return credentialsFromEnv(provider, env);
}

export async function getProviderCredentialSetupError(
  provider: Pick<
    McpOAuthProvider,
    | "name"
    | "displayName"
    | "clientIdEnv"
    | "clientSecretEnv"
    | "registrationEndpoint"
    | "tokenAuthMethod"
  >,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<string | null> {
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
