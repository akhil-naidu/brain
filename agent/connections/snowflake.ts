import { defineMcpClientConnection } from "eve/connections";
import {
  resolveProviderMcpUrlSync,
  resolveProviderPatTokenSync,
} from "../lib/connection-credentials";
import { approvalForTool } from "../lib/define-mcp-oauth-connection";
import type { McpOAuthProvider } from "../lib/mcp-oauth";
import { SNOWFLAKE_COMPILED_MCP_URL } from "./snowflake-mcp-url.generated";
import { SNOWFLAKE_MCP_URL_ENV, SNOWFLAKE_PAT_TOKEN_ENV } from "./snowflake-env";

/**
 * Snowflake-managed MCP (Cortex Agents / Analyst / Search / SQL).
 * Same as Cursor: MCP server URL + Programmatic Access Token (Bearer).
 * Configure in Connections → Set up (stored under `.eve/`) or via env.
 *
 * https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp
 */
export { SNOWFLAKE_MCP_URL_ENV, SNOWFLAKE_PAT_TOKEN_ENV };

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

/** URL eve compiles into the connection manifest (generated file, then live resolve). */
export function snowflakeConnectionMcpUrl(
  env: { readonly [key: string]: string | undefined } = process.env,
): string {
  return resolveSnowflakeMcpUrl(env) ?? SNOWFLAKE_COMPILED_MCP_URL;
}

export function createSnowflakeProvider(
  env: { readonly [key: string]: string | undefined } = process.env,
): McpOAuthProvider {
  const mcpUrl = snowflakeConnectionMcpUrl(env);
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
  // Eve persists this `url` into compiled-agent-manifest.json at compile time.
  url: snowflakeConnectionMcpUrl(),
  description:
    "Snowflake-managed MCP (PAT auth, same as Cursor): Cortex Agents, Analyst, Search, SQL, and custom tools. Configure MCP URL + Programmatic Access Token in Connections → Set up.",
  auth: {
    async getToken() {
      const token = resolveSnowflakePatToken();
      if (!token) {
        throw new Error(
          "Snowflake is not set up. Open Connections → Snowflake → Set up and paste your MCP server URL and Programmatic Access Token.",
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
