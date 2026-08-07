import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  reloadSnowflakeConnectionModule,
  renderSnowflakeCompiledMcpUrlModule,
  SNOWFLAKE_MCP_URL_GENERATED_RELATIVE,
} from "@/agent/lib/snowflake-connection-reload";
import { SNOWFLAKE_PLACEHOLDER_MCP_URL } from "@/agent/lib/snowflake-env";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("reloadSnowflakeConnectionModule", () => {
  it("writes the account MCP URL into the generated module for eve compile", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "brain-snowflake-reload-"));
    temporaryDirectories.push(directory);
    const generatedPath = path.join(directory, SNOWFLAKE_MCP_URL_GENERATED_RELATIVE);
    await mkdir(path.dirname(generatedPath), { recursive: true });
    await writeFile(
      generatedPath,
      renderSnowflakeCompiledMcpUrlModule(SNOWFLAKE_PLACEHOLDER_MCP_URL),
      "utf8",
    );

    const mcpUrl =
      "https://myorg-myaccount.snowflakecomputing.com/api/v2/databases/ANALYTICS/schemas/MCP/mcp-servers/BUSINESS_AGENT";
    await reloadSnowflakeConnectionModule(directory, mcpUrl);

    const contents = await readFile(generatedPath, "utf8");
    expect(contents).toContain(mcpUrl);
    expect(contents).toContain("SNOWFLAKE_COMPILED_MCP_URL");
    expect(contents).not.toContain(SNOWFLAKE_PLACEHOLDER_MCP_URL);
  });

  it("resets to the placeholder when mcpUrl is null", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "brain-snowflake-reload-"));
    temporaryDirectories.push(directory);
    const generatedPath = path.join(directory, SNOWFLAKE_MCP_URL_GENERATED_RELATIVE);

    await reloadSnowflakeConnectionModule(
      directory,
      "https://myorg-myaccount.snowflakecomputing.com/api/v2/databases/A/schemas/B/mcp-servers/C",
    );
    await reloadSnowflakeConnectionModule(directory, null);

    const contents = await readFile(generatedPath, "utf8");
    expect(contents).toContain(SNOWFLAKE_PLACEHOLDER_MCP_URL);
  });
});
