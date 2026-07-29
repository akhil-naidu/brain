import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export const gmailProvider: McpOAuthProvider = {
  name: "gmail",
  displayName: "Gmail",
  mcpUrl: "https://gmailmcp.googleapis.com/mcp/v1",
  resource: "https://gmailmcp.googleapis.com/mcp/v1",
  scope: GMAIL_SCOPES,
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  clientIdEnv: "GOOGLE_MCP_CLIENT_ID",
  clientSecretEnv: "GOOGLE_MCP_CLIENT_SECRET",
  tokenAuthMethod: "client_secret_post",
  authorizeExtraParams: {
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  },
};

export default defineMcpOAuthConnection({
  provider: gmailProvider,
  description:
    "Gmail via official Google MCP: read mail, search, draft, send, and manage messages for the signed-in Google account.",
});
