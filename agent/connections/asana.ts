import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";

export const asanaProvider: McpOAuthProvider = {
  name: "asana",
  displayName: "Asana",
  mcpUrl: "https://mcp.asana.com/v2/mcp",
  // Asana docs use https://mcp.asana.com/v2 for the resource parameter.
  resource: "https://mcp.asana.com/v2",
  // MCP apps reject an explicit scope parameter.
  scope: null,
  authorizationEndpoint: "https://app.asana.com/-/oauth_authorize",
  tokenEndpoint: "https://app.asana.com/-/oauth_token",
  clientIdEnv: "ASANA_MCP_CLIENT_ID",
  clientSecretEnv: "ASANA_MCP_CLIENT_SECRET",
  tokenAuthMethod: "client_secret_post",
};

export default defineMcpOAuthConnection({
  provider: asanaProvider,
  description:
    "Asana workspace via official MCP: tasks, projects, status updates, comments, and work graph search.",
});
