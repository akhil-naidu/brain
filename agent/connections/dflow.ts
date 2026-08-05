import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";

/**
 * dFlow Cloud MCP (https://app.dflow.sh/api/mcp).
 * OAuth uses PKCE + dynamic client registration — no env client secrets.
 */
export const dflowProvider: McpOAuthProvider = {
  name: "dflow",
  displayName: "dFlow",
  mcpUrl: "https://app.dflow.sh/api/mcp",
  resource: "https://app.dflow.sh",
  scope: "mcp",
  authorizationEndpoint: "https://app.dflow.sh/oauth/authorize",
  tokenEndpoint: "https://app.dflow.sh/api/oauth/token",
  registrationEndpoint: "https://app.dflow.sh/api/oauth/register",
  tokenAuthMethod: "none",
  safeReadOnlyTools: [
    "list_applications",
    "get_application_by_id",
    "list_environments",
    "get_environment_by_id",
    "get_service_by_id",
    "get_deployments_by_service_id",
    "get_service_runtime_logs",
    "list_templates",
    "get_template_by_id",
    "list_docker_registries",
    "list_github_git_providers",
    "list_github_repositories",
    "list_github_branches",
    "get_github_app_install_url",
  ],
};

export default defineMcpOAuthConnection({
  provider: dflowProvider,
  description:
    "dFlow Cloud via official MCP: applications, environments, services, deployments, runtime logs, templates, Docker registries, and GitHub providers. Use for inspecting and debugging hosted stacks.",
});
