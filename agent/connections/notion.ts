import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";

/**
 * Official Notion MCP (https://mcp.notion.com/mcp).
 * OAuth 2.1 + PKCE with dynamic client registration — no env client secrets.
 * Docs: https://developers.notion.com/docs/mcp
 */
export const notionProvider: McpOAuthProvider = {
  name: "notion",
  displayName: "Notion",
  mcpUrl: "https://mcp.notion.com/mcp",
  resource: "https://mcp.notion.com/mcp",
  scope: "default",
  authorizationEndpoint: "https://mcp.notion.com/authorize",
  tokenEndpoint: "https://mcp.notion.com/token",
  registrationEndpoint: "https://mcp.notion.com/register",
  tokenAuthMethod: "none",
  safeReadOnlyTools: [
    "notion-search",
    "notion-fetch",
    "notion-get-comments",
    "notion-get-teams",
    "notion-get-users",
    "notion-query-data-sources",
    "notion-query-database-view",
    "notion-query-meeting-notes",
    "notion-get-async-task",
    "notion-download-attachment",
  ],
};

export default defineMcpOAuthConnection({
  provider: notionProvider,
  description:
    "Notion workspace via official MCP: search, fetch pages/databases, comments, users, and views. Use for reading and updating Notion content the user can access.",
});
