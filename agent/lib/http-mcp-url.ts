/**
 * Remote Streamable HTTP MCP connections configured via Tools → Set up
 * (MCP server URL, optional bearer token). Eve needs a static connection URL,
 * so Brain fronts these through `/api/mcp/http/[id]`.
 */

export type HttpMcpUrlConnection = {
  readonly name: string;
  readonly displayName: string;
  readonly envUrlKey: string;
  readonly envTokenKey: string;
  readonly safeReadOnlyTools: readonly string[];
  readonly urlPlaceholder: string;
  readonly setupHint: string;
};

export const HTTP_MCP_URL_CONNECTIONS: readonly HttpMcpUrlConnection[] = [
  {
    name: "mongodb",
    displayName: "MongoDB",
    envUrlKey: "MONGODB_MCP_URL",
    envTokenKey: "MONGODB_MCP_TOKEN",
    urlPlaceholder: "https://mcp.example.com/mcp",
    setupHint:
      "Paste the MongoDB MCP Server Streamable HTTP URL. Run the official server with --transport http (or deploy it) and point Brain at that URL. Connection string stays on the MCP server (MDB_MCP_CONNECTION_STRING), not in Brain.",
    safeReadOnlyTools: [
      "connect",
      "find",
      "aggregate",
      "count",
      "explain",
      "list-databases",
      "list-collections",
      "collection-indexes",
      "collection-schema",
      "collection-storage-size",
      "db-stats",
      "mongodb-logs",
      "switch-connection",
      "export",
      "list-knowledge-sources",
      "search-knowledge",
      "atlas-list-orgs",
      "atlas-list-projects",
      "atlas-list-clusters",
      "atlas-inspect-cluster",
      "atlas-inspect-access-list",
      "atlas-list-db-users",
      "atlas-list-alerts",
      "atlas-get-performance-advisor",
      "atlas-local-list-deployments",
      "atlas-streams-discover",
    ],
  },
  {
    name: "toolbox",
    displayName: "MCP Toolbox",
    envUrlKey: "TOOLBOX_MCP_URL",
    envTokenKey: "TOOLBOX_MCP_TOKEN",
    urlPlaceholder: "https://toolbox.example.com/mcp",
    setupHint:
      "Paste the MCP Toolbox Streamable HTTP URL (see mcp-toolbox.dev). Deploy Toolbox with your tools.yaml and point Brain at that endpoint.",
    safeReadOnlyTools: [],
  },
] as const;

export function getHttpMcpUrlConnection(id: string): HttpMcpUrlConnection | undefined {
  return HTTP_MCP_URL_CONNECTIONS.find((connection) => connection.name === id);
}

export function isHttpMcpUrlConnectionId(id: string): boolean {
  return Boolean(getHttpMcpUrlConnection(id));
}

/** Accept http(s) MCP endpoint URLs; strip trailing slash except root. */
export function parseHttpMcpServerUrl(raw: string): { readonly mcpUrl: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  if (!parsed.hostname) {
    return null;
  }
  const path = parsed.pathname.replace(/\/+$/, "") || "/";
  parsed.pathname = path;
  parsed.hash = "";
  return { mcpUrl: parsed.toString() };
}
