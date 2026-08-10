import {
  deleteStoredHttpMcpCredentials,
  deleteWorkspaceHttpMcpCredentials,
  readStoredHttpMcpCredentials,
  readWorkspaceHttpMcpCredentials,
  resolveHttpMcpCredentials,
  writeStoredHttpMcpCredentials,
  writeWorkspaceHttpMcpCredentials,
} from "@/agent/lib/http-mcp-credentials";
import {
  getHttpMcpUrlConnection,
  parseHttpMcpServerUrl,
  type HttpMcpUrlConnection,
} from "@/agent/lib/http-mcp-url";

export type HttpMcpSetupResponse = {
  readonly id: string;
  readonly displayName: string;
  readonly setupKind: "http_mcp";
  readonly requiresClientSecret: false;
  readonly optionalClientSecret: true;
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
  readonly setupHint: string;
  readonly urlPlaceholder: string;
};

function requireConnection(id: string): HttpMcpUrlConnection {
  const connection = getHttpMcpUrlConnection(id);
  if (!connection) {
    throw new Error("Unknown HTTP MCP connection.");
  }
  return connection;
}

export async function buildWorkspaceHttpMcpSetupResponse(input: {
  readonly connectionId: string;
  readonly workspaceId: string;
  readonly canManageCredentials: boolean;
  readonly origin: string;
}): Promise<HttpMcpSetupResponse> {
  const connection = requireConnection(input.connectionId);
  const stored = await readWorkspaceHttpMcpCredentials(input.workspaceId, connection.name);
  const resolved = await resolveHttpMcpCredentials(connection.name, input.workspaceId);
  return {
    id: connection.name,
    displayName: connection.displayName,
    setupKind: "http_mcp",
    requiresClientSecret: false,
    optionalClientSecret: true,
    hasWorkspaceCredentials: Boolean(stored?.mcpServerUrl),
    hasCredentials: Boolean(resolved),
    credentialSource: resolved?.source ?? null,
    storedClientId: input.canManageCredentials ? (stored?.mcpServerUrl ?? null) : null,
    clientIdEnv: connection.envUrlKey,
    clientSecretEnv: connection.envTokenKey,
    callbackPath: "",
    callbackUrl: input.origin,
    canManageCredentials: input.canManageCredentials,
    workspaceId: input.workspaceId,
    setupHint: connection.setupHint,
    urlPlaceholder: connection.urlPlaceholder,
  };
}

export async function buildHostHttpMcpSetupResponse(input: {
  readonly connectionId: string;
  readonly canManageCredentials: boolean;
  readonly origin: string;
}): Promise<HttpMcpSetupResponse> {
  const connection = requireConnection(input.connectionId);
  const stored = await readStoredHttpMcpCredentials(connection.name);
  const resolved = await resolveHttpMcpCredentials(connection.name, null);
  return {
    id: connection.name,
    displayName: connection.displayName,
    setupKind: "http_mcp",
    requiresClientSecret: false,
    optionalClientSecret: true,
    hasStoredCredentials: Boolean(stored?.mcpServerUrl),
    hasCredentials: Boolean(resolved),
    credentialSource: resolved?.source ?? null,
    storedClientId: input.canManageCredentials ? (stored?.mcpServerUrl ?? null) : null,
    clientIdEnv: connection.envUrlKey,
    clientSecretEnv: connection.envTokenKey,
    callbackPath: "",
    callbackUrl: input.origin,
    canManageCredentials: input.canManageCredentials,
    setupHint: connection.setupHint,
    urlPlaceholder: connection.urlPlaceholder,
  };
}

export async function saveWorkspaceHttpMcpSetup(
  workspaceId: string,
  connectionId: string,
  input: { readonly mcpServerUrl: string; readonly bearerToken?: string },
): Promise<string> {
  const connection = requireConnection(connectionId);
  if (!parseHttpMcpServerUrl(input.mcpServerUrl)) {
    throw new Error(`Enter a valid ${connection.displayName} MCP server URL.`);
  }
  const existing = await readWorkspaceHttpMcpCredentials(workspaceId, connection.name);
  const nextToken = input.bearerToken?.trim() || existing?.bearerToken;
  await writeWorkspaceHttpMcpCredentials(workspaceId, connection, {
    mcpServerUrl: input.mcpServerUrl,
    bearerToken: nextToken,
  });
  return connection.displayName;
}

export async function saveHostHttpMcpSetup(
  connectionId: string,
  input: { readonly mcpServerUrl: string; readonly bearerToken?: string },
): Promise<string> {
  const connection = requireConnection(connectionId);
  if (!parseHttpMcpServerUrl(input.mcpServerUrl)) {
    throw new Error(`Enter a valid ${connection.displayName} MCP server URL.`);
  }
  const existing = await readStoredHttpMcpCredentials(connection.name);
  const nextToken = input.bearerToken?.trim() || existing?.bearerToken;
  await writeStoredHttpMcpCredentials(connection, {
    mcpServerUrl: input.mcpServerUrl,
    bearerToken: nextToken,
  });
  return connection.displayName;
}

export async function clearWorkspaceHttpMcpSetup(
  workspaceId: string,
  connectionId: string,
): Promise<string> {
  const connection = requireConnection(connectionId);
  await deleteWorkspaceHttpMcpCredentials(workspaceId, connection.name);
  return connection.displayName;
}

export async function clearHostHttpMcpSetup(connectionId: string): Promise<string> {
  const connection = requireConnection(connectionId);
  await deleteStoredHttpMcpCredentials(connection.name);
  return connection.displayName;
}
