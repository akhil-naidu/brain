import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";

/** Scopes advertised by https://mcp.slack.com/.well-known/oauth-protected-resource */
const SLACK_SCOPES = [
  "search:read.public",
  "search:read.private",
  "search:read.mpim",
  "search:read.im",
  "search:read.files",
  "search:read.users",
  "chat:write",
  "channels:history",
  "groups:history",
  "mpim:history",
  "im:history",
  "canvases:read",
  "canvases:write",
  "users:read",
  "users:read.email",
  "reactions:write",
  "reactions:read",
  "emoji:read",
  "files:read",
  "channels:write",
  "groups:write",
  "im:write",
  "mpim:write",
  "channels:read",
  "groups:read",
  "mpim:read",
].join(" ");

export const slackProvider: McpOAuthProvider = {
  name: "slack",
  displayName: "Slack",
  mcpUrl: "https://mcp.slack.com/mcp",
  resource: "https://mcp.slack.com",
  scope: SLACK_SCOPES,
  authorizationEndpoint: "https://slack.com/oauth/v2_user/authorize",
  tokenEndpoint: "https://slack.com/api/oauth.v2.user.access",
  clientIdEnv: "SLACK_MCP_CLIENT_ID",
  clientSecretEnv: "SLACK_MCP_CLIENT_SECRET",
  tokenAuthMethod: "client_secret_post",
  parseTokenResponse(json) {
    if (json.ok === false) {
      throw new Error(String(json.error ?? "slack_oauth_failed"));
    }
    const accessToken =
      typeof json.access_token === "string" ? json.access_token : undefined;
    if (!accessToken) {
      throw new Error("slack_missing_access_token");
    }
    return {
      accessToken,
      expiresIn: typeof json.expires_in === "number" ? json.expires_in : undefined,
      refreshToken:
        typeof json.refresh_token === "string" ? json.refresh_token : undefined,
    };
  },
};

export default defineMcpOAuthConnection({
  provider: slackProvider,
  description:
    "Slack workspace via official MCP: search messages, read channels/threads, send messages, canvases, reactions, and users.",
});
