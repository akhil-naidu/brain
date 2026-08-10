import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";

/** Scopes advertised by https://mcp.sentry.dev/.well-known/oauth-authorization-server */
const SENTRY_SCOPES = ["org:read", "project:write", "team:write", "event:write"].join(" ");

/**
 * Official Sentry MCP (https://mcp.sentry.dev/mcp).
 * OAuth 2.1 + PKCE with dynamic client registration — no env client secrets.
 * Docs: https://mcp.sentry.dev/
 */
export const sentryProvider: McpOAuthProvider = {
  name: "sentry",
  displayName: "Sentry",
  mcpUrl: "https://mcp.sentry.dev/mcp",
  resource: "https://mcp.sentry.dev/mcp",
  scope: SENTRY_SCOPES,
  authorizationEndpoint: "https://mcp.sentry.dev/oauth/authorize",
  tokenEndpoint: "https://mcp.sentry.dev/oauth/token",
  registrationEndpoint: "https://mcp.sentry.dev/oauth/register",
  tokenAuthMethod: "none",
  safeReadOnlyTools: [
    "whoami",
    "find_organizations",
    "find_projects",
    "find_teams",
    "find_releases",
    "find_dsns",
    "search_issues",
    "search_events",
    "get_sentry_resource",
    "analyze_issue_with_seer",
  ],
};

export default defineMcpOAuthConnection({
  provider: sentryProvider,
  description:
    "Sentry via official MCP: organizations, projects, issues, events, releases, DSNs, and Seer analysis. Use for debugging production errors.",
});
