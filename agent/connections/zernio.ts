import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";

/** Scopes advertised by https://mcp.zernio.com/.well-known/oauth-protected-resource/mcp */
const ZERNIO_SCOPES = [
  "posts:read",
  "posts:write",
  "accounts:read",
  "accounts:write",
  "analytics:read",
  "ads:write",
  "messaging:write",
  "automations:write",
].join(" ");

/**
 * Official Zernio MCP (https://mcp.zernio.com/mcp).
 * OAuth 2.1 + PKCE with open dynamic client registration — no env client secrets.
 * Docs: https://docs.zernio.com/mcp
 */
export const zernioProvider: McpOAuthProvider = {
  name: "zernio",
  displayName: "Zernio",
  mcpUrl: "https://mcp.zernio.com/mcp",
  resource: "https://mcp.zernio.com/mcp",
  scope: ZERNIO_SCOPES,
  authorizationEndpoint: "https://zernio.com/oauth/authorize",
  tokenEndpoint: "https://zernio.com/api/oauth/token",
  registrationEndpoint: "https://zernio.com/api/oauth/register",
  tokenAuthMethod: "none",
  safeReadOnlyTools: [
    "accounts_list",
    "accounts_get",
    "profiles_list",
    "profiles_get",
    "posts_list",
    "posts_get",
    "posts_list_failed",
    "media_check_upload_status",
    "docs_search",
    "search_tools",
  ],
};

export default defineMcpOAuthConnection({
  provider: zernioProvider,
  description:
    "Zernio social/messaging via official MCP: accounts, posts, scheduling, analytics, ads, inbox, and WhatsApp. Use search_tools/call_tool for the full API surface.",
});
