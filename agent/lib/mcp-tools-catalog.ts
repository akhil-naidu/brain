import { createMCPClient } from "@ai-sdk/mcp";
import type { ConnectionPrincipal } from "eve/connections";
import {
  CHAT_CONNECTION_PROVIDERS,
  listChatConnectionStatuses,
  type ConnectionStatusItem,
} from "@/agent/lib/connection-status";
import { getStoredAccessToken, type McpOAuthProvider } from "@/agent/lib/mcp-oauth";

/**
 * Spike note (OpenSpec task 1.x):
 * `GET /eve/v1/info` returns connection metadata + authored/framework tools, but not
 * remote MCP `tools/list` results. Catalog loads via per-connection MCP listTools
 * using the signed-in principal’s stored OAuth token.
 */

export type McpCatalogTool = {
  readonly name: string;
  readonly description: string;
};

export type McpCatalogConnection = {
  readonly connectionId: string;
  readonly connectionName: string;
  readonly tools: readonly McpCatalogTool[];
  readonly error: string | null;
};

export type McpToolsCatalog = {
  readonly connections: readonly McpCatalogConnection[];
};

function isHttpFallbackRetryable(error: unknown): boolean {
  const status =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
      ? error.statusCode
      : typeof error === "object" &&
          error !== null &&
          "status" in error &&
          typeof error.status === "number"
        ? error.status
        : null;
  return status === 400 || status === 404 || status === 405;
}

async function listToolsWithToken(
  provider: McpOAuthProvider,
  accessToken: string,
): Promise<readonly McpCatalogTool[]> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  let client: Awaited<ReturnType<typeof createMCPClient>> | undefined;
  try {
    try {
      client = await createMCPClient({
        transport: { type: "http", url: provider.mcpUrl, headers },
      });
    } catch (error) {
      if (!isHttpFallbackRetryable(error)) {
        throw error;
      }
      client = await createMCPClient({
        transport: { type: "sse", url: provider.mcpUrl, headers },
      });
    }
    const listed = await client.listTools();
    return listed.tools.map((tool) => ({
      name: tool.name,
      description: typeof tool.description === "string" ? tool.description.trim() : "",
    }));
  } finally {
    await client?.close().catch(() => {
      // ignore close errors
    });
  }
}

async function catalogEntryForConnectedProvider(
  provider: McpOAuthProvider,
  principal: ConnectionPrincipal,
): Promise<McpCatalogConnection> {
  const token = await getStoredAccessToken(provider, principal);
  if (!token) {
    return {
      connectionId: provider.name,
      connectionName: provider.displayName,
      tools: [],
      error: "Not connected for this workspace.",
    };
  }

  try {
    const tools = await listToolsWithToken(provider, token.token);
    return {
      connectionId: provider.name,
      connectionName: provider.displayName,
      tools,
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : `Unable to list tools for ${provider.displayName}.`;
    return {
      connectionId: provider.name,
      connectionName: provider.displayName,
      tools: [],
      error: message,
    };
  }
}

export async function buildMcpToolsCatalog(
  principal: ConnectionPrincipal,
  env: { readonly [key: string]: string | undefined } = process.env,
  options?: {
    readonly statuses?: readonly ConnectionStatusItem[];
    readonly listTools?: (
      provider: McpOAuthProvider,
      accessToken: string,
    ) => Promise<readonly McpCatalogTool[]>;
  },
): Promise<McpToolsCatalog> {
  const statuses = options?.statuses ?? (await listChatConnectionStatuses(principal, env));
  const connectedIds = new Set(
    statuses.filter((item) => item.status === "connected").map((item) => item.id),
  );
  const providers = CHAT_CONNECTION_PROVIDERS.filter((provider) => connectedIds.has(provider.name));

  if (providers.length === 0) {
    return { connections: [] };
  }

  const listTools = options?.listTools;
  const connections = await Promise.all(
    providers.map(async (provider) => {
      if (!listTools) {
        return catalogEntryForConnectedProvider(provider, principal);
      }
      const token = await getStoredAccessToken(provider, principal);
      if (!token) {
        return {
          connectionId: provider.name,
          connectionName: provider.displayName,
          tools: [],
          error: "Not connected for this workspace.",
        } satisfies McpCatalogConnection;
      }
      try {
        const tools = await listTools(provider, token.token);
        return {
          connectionId: provider.name,
          connectionName: provider.displayName,
          tools,
          error: null,
        } satisfies McpCatalogConnection;
      } catch (error) {
        return {
          connectionId: provider.name,
          connectionName: provider.displayName,
          tools: [],
          error:
            error instanceof Error && error.message.trim()
              ? error.message.trim()
              : `Unable to list tools for ${provider.displayName}.`,
        } satisfies McpCatalogConnection;
      }
    }),
  );

  return { connections };
}
