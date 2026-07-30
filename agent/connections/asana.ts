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
  safeReadOnlyTools: [
    "search_objects",
    "search_tasks",
    "get_status_overview",
    "get_task",
    "get_tasks",
    "get_project",
    "get_projects",
    "get_portfolio",
    "get_portfolios",
    "get_items_for_portfolio",
    "get_user",
    "get_workspace_users",
  ],
};

export default defineMcpOAuthConnection({
  provider: asanaProvider,
  description:
    "Asana workspace via official MCP: tasks, projects, status updates, comments, and work graph search.",
});
