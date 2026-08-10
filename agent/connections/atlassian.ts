import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";

/**
 * Scopes from https://mcp.atlassian.com/.well-known/oauth-protected-resource/v1/mcp/authv2
 * (Atlassian Rovo MCP).
 */
const ATLASSIAN_SCOPES = [
  "read:me",
  "read:account",
  "offline_access",
  "email",
  "read:jira-work",
  "write:jira-work",
  "search:confluence",
  "read:confluence-user",
  "read:page:confluence",
  "write:page:confluence",
  "read:comment:confluence",
  "write:comment:confluence",
  "read:space:confluence",
  "read:hierarchical-content:confluence",
  "read:component:compass",
  "write:component:compass",
].join(" ");

/**
 * Official Atlassian Rovo MCP (https://mcp.atlassian.com/v1/mcp/authv2).
 * OAuth 2.1 + PKCE with dynamic client registration — no env client secrets.
 * Docs: https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/
 */
export const atlassianProvider: McpOAuthProvider = {
  name: "atlassian",
  displayName: "Atlassian",
  mcpUrl: "https://mcp.atlassian.com/v1/mcp/authv2",
  resource: "https://mcp.atlassian.com/v1/mcp/authv2",
  scope: ATLASSIAN_SCOPES,
  authorizationEndpoint: "https://mcp.atlassian.com/v1/authorize",
  tokenEndpoint: "https://cf.mcp.atlassian.com/v1/token",
  registrationEndpoint: "https://cf.mcp.atlassian.com/v1/register",
  tokenAuthMethod: "none",
  safeReadOnlyTools: [
    "atlassianUserInfo",
    "getAccessibleAtlassianResources",
    "getJiraIssue",
    "getJiraIssueRemoteIssueLinks",
    "getJiraIssueTypeMetaWithFields",
    "getJiraProjectIssueTypesMetadata",
    "getIssueLinkTypes",
    "getTransitionsForJiraIssue",
    "getVisibleJiraProjects",
    "lookupJiraAccountId",
    "searchJiraIssuesUsingJql",
    "getConfluencePage",
    "getConfluencePageDescendants",
    "getConfluencePageFooterComments",
    "getConfluencePageInlineComments",
    "getConfluenceCommentChildren",
    "getConfluenceSpaces",
    "getPagesInConfluenceSpace",
    "searchConfluenceUsingCql",
    "searchAtlassian",
    "fetchAtlassian",
    "getCompassComponent",
    "getCompassComponents",
    "getCompassComponentActivityEvents",
    "getCompassComponentLabels",
    "getCompassComponentTypes",
    "getCompassCustomFieldDefinitions",
    "getCompassComponentsOwnedByMyTeams",
  ],
};

export default defineMcpOAuthConnection({
  provider: atlassianProvider,
  description:
    "Atlassian Rovo via official MCP: Jira, Confluence, and Compass. Use getAccessibleAtlassianResources first for cloudId, then search or update work items and pages.",
});
