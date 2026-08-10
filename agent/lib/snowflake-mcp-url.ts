export const SNOWFLAKE_CONNECTION_NAME = "snowflake";
export const SNOWFLAKE_DISPLAY_NAME = "Snowflake";

export const SNOWFLAKE_MCP_SERVER_URL_ENV = "SNOWFLAKE_MCP_SERVER_URL";
export const SNOWFLAKE_PAT_TOKEN_ENV = "SNOWFLAKE_PAT_TOKEN";

/** Placeholder so the connection module loads when the URL env is unset. */
export const SNOWFLAKE_PLACEHOLDER_MCP_URL =
  "https://example.snowflakecomputing.com/api/v2/databases/EXAMPLE/schemas/PUBLIC/mcp-servers/example";

export function parseSnowflakeMcpServerUrl(
  value: string | undefined,
): { readonly mcpUrl: string; readonly origin: string } | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") {
    return null;
  }
  if (!parsed.hostname.endsWith(".snowflakecomputing.com")) {
    return null;
  }
  if (!parsed.pathname.includes("/mcp-servers/")) {
    return null;
  }
  return { mcpUrl: trimmed.replace(/\/+$/, ""), origin: parsed.origin };
}

export function resolveSnowflakeMcpServerUrl(
  env: { readonly [key: string]: string | undefined } = process.env,
): { readonly mcpUrl: string; readonly origin: string } | null {
  return parseSnowflakeMcpServerUrl(env[SNOWFLAKE_MCP_SERVER_URL_ENV]);
}

export function resolveSnowflakePatToken(
  env: { readonly [key: string]: string | undefined } = process.env,
): string | null {
  const token = env[SNOWFLAKE_PAT_TOKEN_ENV]?.trim();
  return token || null;
}

/** Host-scoped PAT auth (Cursor-style). No OAuth app id/secret. */
export function getSnowflakePatSetupError(
  env: { readonly [key: string]: string | undefined } = process.env,
): string | null {
  if (!resolveSnowflakeMcpServerUrl(env)) {
    return `Set ${SNOWFLAKE_MCP_SERVER_URL_ENV} to your Snowflake MCP server URL, then restart Brain`;
  }
  if (!resolveSnowflakePatToken(env)) {
    return `Set ${SNOWFLAKE_PAT_TOKEN_ENV} to a Snowflake programmatic access token, then restart Brain`;
  }
  return null;
}
