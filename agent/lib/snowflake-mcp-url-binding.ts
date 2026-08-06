import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/** Placeholder until Set up writes the account-specific MCP server URL. */
export const SNOWFLAKE_PLACEHOLDER_MCP_URL =
  "https://org-account.snowflakecomputing.com/api/v2/databases/EXAMPLE/schemas/EXAMPLE/mcp-servers/EXAMPLE";

/** Written under `agent/lib/` so eve discovers and rebuilds when it changes. */
export function snowflakeMcpUrlBindingPath(cwd: string = process.cwd()): string {
  return path.join(cwd, "agent/lib/snowflake-mcp-url.ts");
}

function renderSnowflakeMcpUrlBinding(mcpUrl: string): string {
  return `/**
 * Auto-written by Snowflake Set up so eve recompiles \`defineMcpClientConnection({ url })\`.
 * Do not put secrets here. Prefer Connections → Snowflake → Set up.
 */
export const SNOWFLAKE_CONNECTION_MCP_URL =
  ${JSON.stringify(mcpUrl)};
`;
}

/**
 * Eve bakes MCP `url` into the compiled connection at module load. Writing this
 * file forces a rebuild so `connection_search` uses the URL from Set up instead
 * of a stale value (e.g. deprecated `/api/v2/cortex/mcp`).
 */
export async function writeSnowflakeConnectionMcpUrlBinding(
  mcpUrl: string | null | undefined,
  cwd: string = process.cwd(),
): Promise<string> {
  const trimmed = mcpUrl?.trim();
  const url =
    trimmed && URL.canParse(trimmed) && /^https?:\/\//i.test(trimmed)
      ? trimmed.replace(/\/+$/u, "")
      : SNOWFLAKE_PLACEHOLDER_MCP_URL;

  const destination = snowflakeMcpUrlBindingPath(cwd);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, renderSnowflakeMcpUrlBinding(url), "utf8");
  return url;
}
