import {
  deleteStoredSnowflakeCredentials,
  deleteWorkspaceSnowflakeCredentials,
  readStoredSnowflakeCredentials,
  readWorkspaceSnowflakeCredentials,
  resolveSnowflakeCredentials,
  writeStoredSnowflakeCredentials,
  writeWorkspaceSnowflakeCredentials,
} from "@/agent/lib/snowflake-credentials";
import {
  parseSnowflakeMcpServerUrl,
  SNOWFLAKE_CONNECTION_NAME,
  SNOWFLAKE_DISPLAY_NAME,
  SNOWFLAKE_MCP_SERVER_URL_ENV,
  SNOWFLAKE_PAT_TOKEN_ENV,
} from "@/agent/lib/snowflake-mcp-url";

export type SnowflakeSetupResponse = {
  readonly id: string;
  readonly displayName: string;
  readonly setupKind: "pat";
  readonly requiresClientSecret: true;
  readonly hasStoredCredentials?: boolean;
  readonly hasWorkspaceCredentials?: boolean;
  readonly hasCredentials: boolean;
  readonly credentialSource: "workspace" | "stored" | "env" | null;
  readonly storedClientId: string | null;
  readonly clientIdEnv: string;
  readonly clientSecretEnv: string;
  readonly callbackPath: string;
  readonly callbackUrl: string;
  readonly canManageCredentials: boolean;
  readonly workspaceId?: string;
};

export async function buildWorkspaceSnowflakeSetupResponse(input: {
  readonly workspaceId: string;
  readonly canManageCredentials: boolean;
  readonly origin: string;
}): Promise<SnowflakeSetupResponse> {
  const stored = await readWorkspaceSnowflakeCredentials(input.workspaceId);
  const resolved = await resolveSnowflakeCredentials(input.workspaceId);
  return {
    id: SNOWFLAKE_CONNECTION_NAME,
    displayName: SNOWFLAKE_DISPLAY_NAME,
    setupKind: "pat",
    requiresClientSecret: true,
    hasWorkspaceCredentials: Boolean(stored?.mcpServerUrl && stored.patToken),
    hasCredentials: Boolean(resolved),
    credentialSource: resolved?.source ?? null,
    storedClientId: input.canManageCredentials ? (stored?.mcpServerUrl ?? null) : null,
    clientIdEnv: SNOWFLAKE_MCP_SERVER_URL_ENV,
    clientSecretEnv: SNOWFLAKE_PAT_TOKEN_ENV,
    callbackPath: "",
    callbackUrl: input.origin,
    canManageCredentials: input.canManageCredentials,
    workspaceId: input.workspaceId,
  };
}

export async function buildHostSnowflakeSetupResponse(input: {
  readonly canManageCredentials: boolean;
  readonly origin: string;
}): Promise<SnowflakeSetupResponse> {
  const stored = await readStoredSnowflakeCredentials();
  const resolved = await resolveSnowflakeCredentials(null);
  return {
    id: SNOWFLAKE_CONNECTION_NAME,
    displayName: SNOWFLAKE_DISPLAY_NAME,
    setupKind: "pat",
    requiresClientSecret: true,
    hasStoredCredentials: Boolean(stored?.mcpServerUrl && stored.patToken),
    hasCredentials: Boolean(resolved),
    credentialSource: resolved?.source ?? null,
    storedClientId: input.canManageCredentials ? (stored?.mcpServerUrl ?? null) : null,
    clientIdEnv: SNOWFLAKE_MCP_SERVER_URL_ENV,
    clientSecretEnv: SNOWFLAKE_PAT_TOKEN_ENV,
    callbackPath: "",
    callbackUrl: input.origin,
    canManageCredentials: input.canManageCredentials,
  };
}

export async function saveWorkspaceSnowflakeSetup(
  workspaceId: string,
  input: { readonly mcpServerUrl: string; readonly patToken?: string },
): Promise<void> {
  if (!parseSnowflakeMcpServerUrl(input.mcpServerUrl)) {
    throw new Error("Enter a valid Snowflake MCP server URL.");
  }
  const existing = await readWorkspaceSnowflakeCredentials(workspaceId);
  const nextPat = input.patToken?.trim() || existing?.patToken;
  if (!nextPat) {
    throw new Error("Programmatic access token (PAT) is required.");
  }
  await writeWorkspaceSnowflakeCredentials(workspaceId, {
    mcpServerUrl: input.mcpServerUrl,
    patToken: nextPat,
  });
}

export async function saveHostSnowflakeSetup(input: {
  readonly mcpServerUrl: string;
  readonly patToken?: string;
}): Promise<void> {
  if (!parseSnowflakeMcpServerUrl(input.mcpServerUrl)) {
    throw new Error("Enter a valid Snowflake MCP server URL.");
  }
  const existing = await readStoredSnowflakeCredentials();
  const nextPat = input.patToken?.trim() || existing?.patToken;
  if (!nextPat) {
    throw new Error("Programmatic access token (PAT) is required.");
  }
  await writeStoredSnowflakeCredentials({
    mcpServerUrl: input.mcpServerUrl,
    patToken: nextPat,
  });
}

export async function clearWorkspaceSnowflakeSetup(workspaceId: string): Promise<void> {
  await deleteWorkspaceSnowflakeCredentials(workspaceId);
}

export async function clearHostSnowflakeSetup(): Promise<void> {
  await deleteStoredSnowflakeCredentials();
}
