import { defineMcpClientConnection } from "eve/connections";
import {
  resolveProviderMcpUrlSync,
  resolveProviderPatTokenSync,
} from "../lib/connection-credentials";
import { approvalForTool } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";
import { SNOWFLAKE_CONNECTION_MCP_URL } from "../lib/snowflake-mcp-url";

/**
 * Snowflake-managed MCP (Cortex Agents / Analyst / Search / SQL).
 * Auth matches Cursor's Snowflake plugin: MCP URL + Programmatic Access Token
 * as `Authorization: Bearer …` — no OAuth security integration required.
 *
 * The connection `url` is imported from `snowflake-mcp-url.ts` so eve
 * recompiles when Set up writes a new account-specific MCP server path.
 *
 * https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp
 * https://github.com/snowflakedb/snowflake-cursor-plugin
 */
export const SNOWFLAKE_MCP_URL_ENV = "SNOWFLAKE_MCP_URL";
export const SNOWFLAKE_PAT_TOKEN_ENV = "SNOWFLAKE_PAT_TOKEN";

const snowflakeLookup = {
  name: "snowflake",
  mcpUrlEnv: SNOWFLAKE_MCP_URL_ENV,
  patTokenEnv: SNOWFLAKE_PAT_TOKEN_ENV,
} as const;

export function resolveSnowflakeMcpUrl(
  env: { readonly [key: string]: string | undefined } = process.env,
): string | null {
  return resolveProviderMcpUrlSync(snowflakeLookup, env);
}

export function resolveSnowflakePatToken(
  env: { readonly [key: string]: string | undefined } = process.env,
): string | null {
  return resolveProviderPatTokenSync(snowflakeLookup, env);
}

export function createSnowflakeProvider(
  env: { readonly [key: string]: string | undefined } = process.env,
): McpOAuthProvider {
  const mcpUrl = resolveSnowflakeMcpUrl(env) ?? SNOWFLAKE_CONNECTION_MCP_URL;
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
    authKind: "pat",
    patTokenEnv: SNOWFLAKE_PAT_TOKEN_ENV,
    mcpUrlEnv: SNOWFLAKE_MCP_URL_ENV,
    // Unused for PAT — kept so status helpers share McpOAuthProvider.
    scope: null,
    authorizationEndpoint: `${origin}/oauth/authorize`,
    tokenEndpoint: `${origin}/oauth/token-request`,
    tokenAuthMethod: "none",
    includeResourceIndicator: false,
    safeReadOnlyTools: [],
  };
}

export const snowflakeProvider = createSnowflakeProvider();

export default defineMcpClientConnection({
  // Must be a compile-time string import — eve bakes this into the connection.
  url: SNOWFLAKE_CONNECTION_MCP_URL,
  description:
    "Snowflake-managed MCP (PAT auth, same as Cursor): Cortex Agents, Analyst, Search, SQL, and custom tools. Configure MCP URL + Programmatic Access Token in Connections → Set up.",
  auth: {
    async getToken() {
      const token = resolveSnowflakePatToken();
      if (!token) {
        throw new Error(
          "Snowflake is not set up. Open Connections → Snowflake → Set up and paste your MCP server URL and Programmatic Access Token (Snowsight → Settings → Authentication → Programmatic Access Tokens).",
        );
      }
      return { token };
    },
  },
  approval: ({ toolName }) => {
    const provider = createSnowflakeProvider();
    return approvalForTool(provider.name, provider.safeReadOnlyTools, toolName);
  },
});
