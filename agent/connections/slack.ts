import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import { OAuthRequestError, type McpOAuthProvider } from "../lib/mcp-oauth";
import { z } from "zod";

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

const slackTokenResponseSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      access_token: z.string().min(1),
      expires_in: z.number().finite().nonnegative().optional(),
      refresh_token: z.string().min(1).optional(),
    })
    .passthrough(),
  z
    .object({
      ok: z.literal(false),
      error: z.string().optional(),
    })
    .passthrough(),
]);

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
    const result = slackTokenResponseSchema.safeParse(json);
    if (!result.success) throw new OAuthRequestError("malformed_response");
    if (!result.data.ok) throw new OAuthRequestError("token_exchange_failed");
    return {
      accessToken: result.data.access_token,
      expiresIn: result.data.expires_in,
      refreshToken: result.data.refresh_token,
    };
  },
  safeReadOnlyTools: [
    "search_messages",
    "search_channels",
    "search_users",
    "search_emoji",
    "read_channel_history",
    "read_thread",
    "list_channel_members",
    "get_user_profile",
    "read_canvas",
  ],
};

export default defineMcpOAuthConnection({
  provider: slackProvider,
  description:
    "Slack workspace via official MCP: search messages, read channels/threads, send messages, canvases, reactions, and users.",
});
