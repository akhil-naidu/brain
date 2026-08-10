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
  getHttpMcpUrlConnection,
  parseHttpMcpServerUrl,
  type HttpMcpUrlConnection,
} from "@/agent/lib/http-mcp-url";

export type ResolvedHttpMcpCredentials = {
  readonly mcpServerUrl: string;
  readonly bearerToken?: string;
  readonly source: AppCredentialSource;
};

export async function readStoredHttpMcpCredentials(connectionName: string): Promise<{
  readonly mcpServerUrl: string;
  readonly bearerToken?: string;
} | null> {
  const stored = await readStoredAppCredentials(connectionName);
  if (!stored?.clientId) {
    return null;
  }
  return { mcpServerUrl: stored.clientId, bearerToken: stored.clientSecret };
}

export async function readWorkspaceHttpMcpCredentials(
  workspaceId: string,
  connectionName: string,
): Promise<{
  readonly mcpServerUrl: string;
  readonly bearerToken?: string;
} | null> {
  const stored = await readWorkspaceAppCredentials(workspaceId, connectionName);
  if (!stored?.clientId) {
    return null;
  }
  return { mcpServerUrl: stored.clientId, bearerToken: stored.clientSecret };
}

export async function writeStoredHttpMcpCredentials(
  connection: HttpMcpUrlConnection,
  input: { readonly mcpServerUrl: string; readonly bearerToken?: string },
): Promise<void> {
  const parsed = parseHttpMcpServerUrl(input.mcpServerUrl);
  if (!parsed) {
    throw new Error(
      `Enter a valid ${connection.displayName} MCP server URL (http:// or https://).`,
    );
  }
  await writeStoredAppCredentials(connection.name, {
    clientId: parsed.mcpUrl,
    clientSecret: input.bearerToken,
  });
}

export async function writeWorkspaceHttpMcpCredentials(
  workspaceId: string,
  connection: HttpMcpUrlConnection,
  input: { readonly mcpServerUrl: string; readonly bearerToken?: string },
): Promise<void> {
  const parsed = parseHttpMcpServerUrl(input.mcpServerUrl);
  if (!parsed) {
    throw new Error(
      `Enter a valid ${connection.displayName} MCP server URL (http:// or https://).`,
    );
  }
  await writeWorkspaceAppCredentials(workspaceId, connection.name, {
    clientId: parsed.mcpUrl,
    clientSecret: input.bearerToken,
  });
}

export async function deleteStoredHttpMcpCredentials(connectionName: string): Promise<void> {
  await deleteStoredAppCredentials(connectionName);
}

export async function deleteWorkspaceHttpMcpCredentials(
  workspaceId: string,
  connectionName: string,
): Promise<void> {
  await deleteWorkspaceAppCredentials(workspaceId, connectionName);
}

/**
 * Prefer workspace UI credentials, then host UI credentials, then process env.
 */
export async function resolveHttpMcpCredentials(
  connectionName: string,
  workspaceId?: string | null,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<ResolvedHttpMcpCredentials | null> {
  const connection = getHttpMcpUrlConnection(connectionName);
  if (!connection) {
    return null;
  }

  const trimmedWorkspace = workspaceId?.trim();
  if (trimmedWorkspace) {
    const workspace = await readWorkspaceHttpMcpCredentials(trimmedWorkspace, connectionName);
    if (workspace?.mcpServerUrl) {
      const parsed = parseHttpMcpServerUrl(workspace.mcpServerUrl);
      if (parsed) {
        return {
          mcpServerUrl: parsed.mcpUrl,
          bearerToken: workspace.bearerToken?.trim() || undefined,
          source: "workspace",
        };
      }
    }
  }

  const host = await readStoredHttpMcpCredentials(connectionName);
  if (host?.mcpServerUrl) {
    const parsed = parseHttpMcpServerUrl(host.mcpServerUrl);
    if (parsed) {
      return {
        mcpServerUrl: parsed.mcpUrl,
        bearerToken: host.bearerToken?.trim() || undefined,
        source: "stored",
      };
    }
  }

  const envUrl = env[connection.envUrlKey]?.trim();
  if (envUrl) {
    const parsed = parseHttpMcpServerUrl(envUrl);
    if (parsed) {
      const envToken = env[connection.envTokenKey]?.trim();
      return {
        mcpServerUrl: parsed.mcpUrl,
        bearerToken: envToken || undefined,
        source: "env",
      };
    }
  }

  return null;
}

export async function getHttpMcpCredentialSetupError(
  connectionName: string,
  workspaceId?: string | null,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<string | null> {
  const connection = getHttpMcpUrlConnection(connectionName);
  if (!connection) {
    return "Unknown connection.";
  }
  const resolved = await resolveHttpMcpCredentials(connectionName, workspaceId, env);
  if (resolved) {
    return null;
  }
  return `Set up ${connection.displayName} to continue`;
}
