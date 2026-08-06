import { defineMcpOAuthConnection } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";

/**
 * Snowflake-managed MCP server (Cortex Agents / Analyst / Search / SQL).
 * https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp
 *
 * Requires a per-account MCP server URL plus a Snowflake OAuth security
 * integration (no dynamic client registration).
 */
export const SNOWFLAKE_MCP_URL_ENV = "SNOWFLAKE_MCP_URL";
export const SNOWFLAKE_MCP_SCOPE_ENV = "SNOWFLAKE_MCP_SCOPE";
export const SNOWFLAKE_MCP_CLIENT_ID_ENV = "SNOWFLAKE_MCP_CLIENT_ID";
export const SNOWFLAKE_MCP_CLIENT_SECRET_ENV = "SNOWFLAKE_MCP_CLIENT_SECRET";

/** Used only so the connection module can load before env is configured. */
const PLACEHOLDER_MCP_URL =
  "https://org-account.snowflakecomputing.com/api/v2/databases/EXAMPLE/schemas/EXAMPLE/mcp-servers/EXAMPLE";

const DEFAULT_SCOPE = "session:role:all";

export function resolveSnowflakeMcpUrl(
  env: { readonly [key: string]: string | undefined } = process.env,
): string | null {
  const url = env[SNOWFLAKE_MCP_URL_ENV]?.trim();
  return url || null;
}

export function createSnowflakeProvider(
  env: { readonly [key: string]: string | undefined } = process.env,
): McpOAuthProvider {
  const mcpUrl = resolveSnowflakeMcpUrl(env) ?? PLACEHOLDER_MCP_URL;
  let origin = "https://org-account.snowflakecomputing.com";
  try {
    origin = new URL(mcpUrl).origin;
  } catch {
    // Keep placeholder origin when the env URL is malformed.
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

/** Resolved at process start — restart Brain after changing `SNOWFLAKE_MCP_URL`. */
export const snowflakeProvider = createSnowflakeProvider();

export default defineMcpOAuthConnection({
  provider: snowflakeProvider,
  description:
    "Snowflake-managed MCP: Cortex Agents, Cortex Analyst, Cortex Search, SQL execution, and custom tools. Use for governed business data questions against the configured Snowflake MCP server.",
});
