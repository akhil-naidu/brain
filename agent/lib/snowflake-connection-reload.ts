import { utimes } from "node:fs/promises";
import path from "node:path";

/**
 * Eve reads the Snowflake MCP `url` when it loads `snowflake.ts`.
 * Touch that module after Set up so eve recompiles and picks up the new URL
 * from `.eve` credentials — without writing the account URL into source.
 */
export async function reloadSnowflakeConnectionModule(cwd: string = process.cwd()): Promise<void> {
  const destination = path.join(cwd, "agent/connections/snowflake.ts");
  const now = new Date();
  await utimes(destination, now, now);
}
