import {
  deleteStoredAppCredentials,
  deleteWorkspaceAppCredentials,
  readStoredAppCredentials,
  readWorkspaceAppCredentials,
  writeStoredAppCredentials,
  writeWorkspaceAppCredentials,
  type AppCredentialSource,
} from "@/agent/lib/connection-credentials";
import {
  parseSnowflakeMcpServerUrl,
  resolveSnowflakeMcpServerUrl,
  resolveSnowflakePatToken,
  SNOWFLAKE_CONNECTION_NAME,
  SNOWFLAKE_DISPLAY_NAME,
} from "@/agent/lib/snowflake-mcp-url";

export type ResolvedSnowflakeCredentials = {
  readonly mcpServerUrl: string;
  readonly patToken: string;
  readonly source: AppCredentialSource;
};

/**
 * Snowflake stores MCP server URL as clientId and PAT as clientSecret in the
 * same workspace/host credential files as OAuth BYOA apps.
 */
export async function readStoredSnowflakeCredentials(): Promise<{
  readonly mcpServerUrl: string;
  readonly patToken?: string;
} | null> {
  const stored = await readStoredAppCredentials(SNOWFLAKE_CONNECTION_NAME);
  if (!stored?.clientId) {
    return null;
  }
  return { mcpServerUrl: stored.clientId, patToken: stored.clientSecret };
}

export async function readWorkspaceSnowflakeCredentials(workspaceId: string): Promise<{
  readonly mcpServerUrl: string;
  readonly patToken?: string;
} | null> {
  const stored = await readWorkspaceAppCredentials(workspaceId, SNOWFLAKE_CONNECTION_NAME);
  if (!stored?.clientId) {
    return null;
  }
  return { mcpServerUrl: stored.clientId, patToken: stored.clientSecret };
}

export async function writeStoredSnowflakeCredentials(input: {
  readonly mcpServerUrl: string;
  readonly patToken?: string;
}): Promise<void> {
  const parsed = parseSnowflakeMcpServerUrl(input.mcpServerUrl);
  if (!parsed) {
    throw new Error(
      "Enter a valid Snowflake MCP server URL (https://…snowflakecomputing.com/…/mcp-servers/…).",
    );
  }
  await writeStoredAppCredentials(SNOWFLAKE_CONNECTION_NAME, {
    clientId: parsed.mcpUrl,
    clientSecret: input.patToken,
  });
}

export async function writeWorkspaceSnowflakeCredentials(
  workspaceId: string,
  input: { readonly mcpServerUrl: string; readonly patToken?: string },
): Promise<void> {
  const parsed = parseSnowflakeMcpServerUrl(input.mcpServerUrl);
  if (!parsed) {
    throw new Error(
      "Enter a valid Snowflake MCP server URL (https://…snowflakecomputing.com/…/mcp-servers/…).",
    );
  }
  await writeWorkspaceAppCredentials(workspaceId, SNOWFLAKE_CONNECTION_NAME, {
    clientId: parsed.mcpUrl,
    clientSecret: input.patToken,
  });
}

export async function deleteStoredSnowflakeCredentials(): Promise<void> {
  await deleteStoredAppCredentials(SNOWFLAKE_CONNECTION_NAME);
}

export async function deleteWorkspaceSnowflakeCredentials(workspaceId: string): Promise<void> {
  await deleteWorkspaceAppCredentials(workspaceId, SNOWFLAKE_CONNECTION_NAME);
}

/**
 * Prefer workspace UI credentials, then host UI credentials, then process env.
 */
export async function resolveSnowflakeCredentials(
  workspaceId?: string | null,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<ResolvedSnowflakeCredentials | null> {
  const trimmedWorkspace = workspaceId?.trim();
  if (trimmedWorkspace) {
    const workspace = await readWorkspaceSnowflakeCredentials(trimmedWorkspace);
    if (workspace?.mcpServerUrl && workspace.patToken) {
      const parsed = parseSnowflakeMcpServerUrl(workspace.mcpServerUrl);
      if (parsed) {
        return {
          mcpServerUrl: parsed.mcpUrl,
          patToken: workspace.patToken,
          source: "workspace",
        };
      }
    }
  }

  const host = await readStoredSnowflakeCredentials();
  if (host?.mcpServerUrl && host.patToken) {
    const parsed = parseSnowflakeMcpServerUrl(host.mcpServerUrl);
    if (parsed) {
      return {
        mcpServerUrl: parsed.mcpUrl,
        patToken: host.patToken,
        source: "stored",
      };
    }
  }

  const envUrl = resolveSnowflakeMcpServerUrl(env);
  const envPat = resolveSnowflakePatToken(env);
  if (envUrl && envPat) {
    return {
      mcpServerUrl: envUrl.mcpUrl,
      patToken: envPat,
      source: "env",
    };
  }
  return null;
}

export async function getSnowflakeCredentialSetupError(
  workspaceId?: string | null,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<string | null> {
  const resolved = await resolveSnowflakeCredentials(workspaceId, env);
  if (resolved) {
    return null;
  }

  const trimmedWorkspace = workspaceId?.trim();
  if (trimmedWorkspace) {
    const workspace = await readWorkspaceSnowflakeCredentials(trimmedWorkspace);
    if (workspace?.mcpServerUrl && !workspace.patToken) {
      return `Add the ${SNOWFLAKE_DISPLAY_NAME} PAT to continue`;
    }
  }

  const host = await readStoredSnowflakeCredentials();
  if (host?.mcpServerUrl && !host.patToken) {
    return `Add the ${SNOWFLAKE_DISPLAY_NAME} PAT to continue`;
  }

  return `Set up ${SNOWFLAKE_DISPLAY_NAME} to continue`;
}
