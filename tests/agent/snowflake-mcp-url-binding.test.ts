import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  SNOWFLAKE_PLACEHOLDER_MCP_URL,
  snowflakeMcpUrlBindingPath,
  writeSnowflakeConnectionMcpUrlBinding,
} from "@/agent/lib/snowflake-mcp-url-binding";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("writeSnowflakeConnectionMcpUrlBinding", () => {
  it("writes a recompilable MCP URL module and strips trailing slashes", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "brain-snowflake-url-"));
    temporaryDirectories.push(directory);

    const url =
      "https://myorg-myaccount.snowflakecomputing.com/api/v2/databases/A/schemas/B/mcp-servers/C/";
    const written = await writeSnowflakeConnectionMcpUrlBinding(url, directory);
    expect(written).toBe(url.replace(/\/+$/u, ""));

    const source = await readFile(snowflakeMcpUrlBindingPath(directory), "utf8");
    expect(source).toContain(JSON.stringify(written));
    expect(source).toContain("SNOWFLAKE_CONNECTION_MCP_URL");
    expect(snowflakeMcpUrlBindingPath(directory)).toContain(
      `${path.sep}agent${path.sep}lib${path.sep}snowflake-mcp-url.ts`,
    );
  });

  it("resets to the placeholder when cleared", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "brain-snowflake-url-"));
    temporaryDirectories.push(directory);

    await writeSnowflakeConnectionMcpUrlBinding(null, directory);
    const source = await readFile(snowflakeMcpUrlBindingPath(directory), "utf8");
    expect(source).toContain(JSON.stringify(SNOWFLAKE_PLACEHOLDER_MCP_URL));
  });
});
