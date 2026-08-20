import {
  deleteStoredHttpMcpCredentials,
  deleteWorkspaceHttpMcpCredentials,
  getHttpMcpCredentialSetupError,
  readStoredHttpMcpCredentials,
  readWorkspaceHttpMcpCredentials,
  resolveHttpMcpCredentials,
  writeStoredHttpMcpCredentials,
  writeWorkspaceHttpMcpCredentials,
} from "@/agent/lib/http-mcp-credentials";
import {
  getHttpMcpUrlConnection,
  httpMcpRequiresBearer,
  parseHttpMcpServerUrl,
  type HttpMcpUrlConnection,
} from "@/agent/lib/http-mcp-url";

export type HttpMcpSetupResponse = {
  readonly id: string;
  readonly displayName: string;
  readonly setupKind: "http_mcp";
  readonly requiresClientSecret: boolean;
  readonly optionalClientSecret: boolean;
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

function httpMcpSetupSecretFlags(connection: HttpMcpUrlConnection): {
  readonly requiresClientSecret: boolean;
  readonly optionalClientSecret: boolean;
} {
  if (httpMcpRequiresBearer(connection)) {
    return { requiresClientSecret: true, optionalClientSecret: false };
  }
  return { requiresClientSecret: false, optionalClientSecret: true };
}

function nextHttpMcpBearerToken(
  connection: HttpMcpUrlConnection,
  inputToken: string | undefined,
  existingToken: string | undefined,
): string | undefined {
  const nextToken = inputToken?.trim() || existingToken;
  if (httpMcpRequiresBearer(connection) && !nextToken) {
    throw new Error(`${connection.displayName} needs an API key.`);
  }
  return nextToken;
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
  const setupError = await getHttpMcpCredentialSetupError(connection.name, input.workspaceId);
  return {
    id: connection.name,
    displayName: connection.displayName,
    setupKind: "http_mcp",
    ...httpMcpSetupSecretFlags(connection),
    hasWorkspaceCredentials: Boolean(stored?.mcpServerUrl),
    hasCredentials: setupError === null,
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
  const setupError = await getHttpMcpCredentialSetupError(connection.name, null);
  return {
    id: connection.name,
    displayName: connection.displayName,
    setupKind: "http_mcp",
    ...httpMcpSetupSecretFlags(connection),
    hasStoredCredentials: Boolean(stored?.mcpServerUrl),
    hasCredentials: setupError === null,
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
  const nextToken = nextHttpMcpBearerToken(connection, input.bearerToken, existing?.bearerToken);
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
  const nextToken = nextHttpMcpBearerToken(connection, input.bearerToken, existing?.bearerToken);
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
