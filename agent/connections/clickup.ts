import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";

export const clickupProvider: McpOAuthProvider = {
  name: "clickup",
  displayName: "ClickUp",
  mcpUrl: "https://mcp.clickup.com/mcp",
  resource: "https://mcp.clickup.com/mcp",
  scope: "read write",
  authorizationEndpoint: "https://mcp.clickup.com/oauth/authorize",
  tokenEndpoint: "https://mcp.clickup.com/oauth/token",
  registrationEndpoint: "https://mcp.clickup.com/oauth/register",
  tokenAuthMethod: "none",
};

export default defineMcpOAuthConnection({
  provider: clickupProvider,
  description:
    "ClickUp workspace via official MCP: tasks, docs, chat/channels, threads, comments, and reporting. Use for searching work and creating tickets.",
});
