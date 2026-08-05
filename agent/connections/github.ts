import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";

/**
 * Official remote GitHub MCP (https://api.githubcopilot.com/mcp/).
 * Needs a GitHub OAuth App (no DCR). Prefer Configure in the connections menu.
 */
const GITHUB_SCOPES = ["repo", "read:org", "read:user", "user:email", "notifications"].join(" ");

export const githubProvider: McpOAuthProvider = {
  name: "github",
  displayName: "GitHub",
  mcpUrl: "https://api.githubcopilot.com/mcp/",
  resource: "https://api.githubcopilot.com/mcp/",
  scope: GITHUB_SCOPES,
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  tokenEndpoint: "https://github.com/login/oauth/access_token",
  clientIdEnv: "GITHUB_MCP_CLIENT_ID",
  clientSecretEnv: "GITHUB_MCP_CLIENT_SECRET",
  tokenAuthMethod: "client_secret_post",
  includeResourceIndicator: false,
  safeReadOnlyTools: [
    "get_me",
    "get_file_contents",
    "search_code",
    "search_repositories",
    "search_issues",
    "search_pull_requests",
    "list_issues",
    "list_pull_requests",
    "issue_read",
    "pull_request_read",
    "list_commits",
    "get_commit",
    "list_branches",
    "list_tags",
    "get_tag",
    "list_releases",
    "get_latest_release",
    "get_release_by_tag",
    "list_notifications",
    "get_notification_details",
    "get_teams",
    "get_team_members",
  ],
};

export default defineMcpOAuthConnection({
  provider: githubProvider,
  description:
    "GitHub via official remote MCP: repositories, issues, pull requests, code search, commits, releases, and notifications. Use for inspecting and updating GitHub work.",
});
