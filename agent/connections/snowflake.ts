import { resolveProviderMcpUrlSync } from "../lib/connection-credentials";
import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";

/**
 * Snowflake-managed MCP server (Cortex Agents / Analyst / Search / SQL).
 * https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp
 *
 * Requires a per-account MCP server URL plus a Snowflake OAuth security
 * integration (no dynamic client registration). Prefer Set up in the
 * connections menu; env vars remain a deploy-time fallback.
 */
export const SNOWFLAKE_MCP_URL_ENV = "SNOWFLAKE_MCP_URL";
export const SNOWFLAKE_MCP_SCOPE_ENV = "SNOWFLAKE_MCP_SCOPE";
export const SNOWFLAKE_MCP_CLIENT_ID_ENV = "SNOWFLAKE_MCP_CLIENT_ID";
export const SNOWFLAKE_MCP_CLIENT_SECRET_ENV = "SNOWFLAKE_MCP_CLIENT_SECRET";

/** Used only so the connection module can load before setup is configured. */
const PLACEHOLDER_MCP_URL =
  "https://org-account.snowflakecomputing.com/api/v2/databases/EXAMPLE/schemas/EXAMPLE/mcp-servers/EXAMPLE";

const DEFAULT_SCOPE = "session:role:all";

const snowflakeMcpUrlLookup = {
  name: "snowflake",
  mcpUrlEnv: SNOWFLAKE_MCP_URL_ENV,
} as const;

export function resolveSnowflakeMcpUrl(
  env: { readonly [key: string]: string | undefined } = process.env,
): string | null {
  return resolveProviderMcpUrlSync(snowflakeMcpUrlLookup, env);
}

export function createSnowflakeProvider(
  env: { readonly [key: string]: string | undefined } = process.env,
): McpOAuthProvider {
  const mcpUrl = resolveSnowflakeMcpUrl(env) ?? PLACEHOLDER_MCP_URL;
  let origin = "https://org-account.snowflakecomputing.com";
  try {
    origin = new URL(mcpUrl).origin;
  } catch {
    // Keep placeholder origin when the configured URL is malformed.
  }

  return {
    name: "snowflake",
    displayName: "Snowflake",
    mcpUrl,
    resource: mcpUrl,
    scope: env[SNOWFLAKE_MCP_SCOPE_ENV]?.trim() || DEFAULT_SCOPE,
    authorizationEndpoint: `${origin}/oauth/authorize`,
    tokenEndpoint: `${origin}/oauth/token-request`,
    clientIdEnv: SNOWFLAKE_MCP_CLIENT_ID_ENV,
    clientSecretEnv: SNOWFLAKE_MCP_CLIENT_SECRET_ENV,
    mcpUrlEnv: SNOWFLAKE_MCP_URL_ENV,
    tokenAuthMethod: "client_secret_post",
    // Classic Snowflake OAuth rejects unknown authorize/token params.
    includeResourceIndicator: false,
    // Tool names are defined per MCP server object — require approval.
    safeReadOnlyTools: [],
  };
}

export const snowflakeProvider = createSnowflakeProvider();

export default defineMcpOAuthConnection({
  provider: snowflakeProvider,
  resolveProvider: () => createSnowflakeProvider(),
  description:
    "Snowflake-managed MCP: Cortex Agents, Cortex Analyst, Cortex Search, SQL execution, and custom tools. Use for governed business data questions against the configured Snowflake MCP server.",
});
