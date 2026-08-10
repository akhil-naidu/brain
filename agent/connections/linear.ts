import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";

/**
 * Official Linear MCP (https://mcp.linear.app/mcp).
 * OAuth 2.1 + PKCE with dynamic client registration — no env client secrets.
 * Docs: https://linear.app/docs/mcp
 */
export const linearProvider: McpOAuthProvider = {
  name: "linear",
  displayName: "Linear",
  mcpUrl: "https://mcp.linear.app/mcp",
  resource: "https://mcp.linear.app/mcp",
  scope: "read write",
  authorizationEndpoint: "https://mcp.linear.app/authorize",
  tokenEndpoint: "https://mcp.linear.app/token",
  registrationEndpoint: "https://mcp.linear.app/register",
  tokenAuthMethod: "none",
  safeReadOnlyTools: [
    "list_issues",
    "get_issue",
    "list_issue_statuses",
    "list_comments",
    "list_projects",
    "get_project",
    "list_teams",
    "get_team",
    "list_users",
    "get_user",
    "list_cycles",
    "get_document",
    "list_documents",
    "list_milestones",
    "list_initiatives",
  ],
};

export default defineMcpOAuthConnection({
  provider: linearProvider,
  description:
    "Linear workspace via official MCP: issues, projects, teams, cycles, comments, and documents. Use for finding and updating Linear work.",
});
