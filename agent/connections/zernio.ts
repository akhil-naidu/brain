import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";

/**
 * Zernio hosted MCP (https://mcp.zernio.com/mcp).
 * Social / messaging / ads across 15+ channels via OAuth 2.1 + PKCE + DCR.
 * https://docs.zernio.com/mcp
 */
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
    "search_tools",
    "accounts_list",
    "accounts_get",
    "profiles_list",
    "profiles_get",
    "posts_list",
    "posts_get",
    "posts_list_failed",
    "media_check_upload_status",
    "docs_search",
  ],
};

export default defineMcpOAuthConnection({
  provider: zernioProvider,
  description:
    "Zernio via hosted MCP: publish and schedule posts, cross-post, analytics, inbox/DMs, WhatsApp, and ads across social channels. Use search_tools to discover less-common capabilities. Confirm before publishing, messaging, or spending on ads.",
});
