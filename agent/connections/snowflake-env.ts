/** Env keys for Snowflake-managed MCP (Cursor-style PAT + account MCP URL). */
export const SNOWFLAKE_MCP_URL_ENV = "SNOWFLAKE_MCP_URL";
export const SNOWFLAKE_PAT_TOKEN_ENV = "SNOWFLAKE_PAT_TOKEN";

/** Used only until Set up / env provides a real account MCP URL. */
export const SNOWFLAKE_PLACEHOLDER_MCP_URL =
  "https://org-account.snowflakecomputing.com/api/v2/databases/EXAMPLE/schemas/EXAMPLE/mcp-servers/EXAMPLE";
