import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createSnowflakeProvider,
  SNOWFLAKE_MCP_URL_ENV,
  SNOWFLAKE_PAT_TOKEN_ENV,
} from "@/agent/connections/snowflake";
import { approvalForTool } from "@/agent/lib/define-mcp-oauth-connection";
import {
  getProviderCredentialSetupError,
  writeStoredAppCredentials,
} from "@/agent/lib/connection-credentials";
import {
  getChatConnectionProvider,
  resolveConnectionAuthStatus,
} from "@/agent/lib/connection-status";

const EXAMPLE_MCP_URL =
  "https://myorg-myaccount.snowflakecomputing.com/api/v2/databases/ANALYTICS/schemas/MCP/mcp-servers/BUSINESS_AGENT";

const originalCwd = process.cwd();
const temporaryDirectories: string[] = [];

async function useTemporaryWorkingDirectory(): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), "brain-snowflake-"));
  temporaryDirectories.push(directory);
  process.chdir(directory);
}

afterEach(async () => {
  process.chdir(originalCwd);
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("Snowflake MCP connection", () => {
  it("is registered as PAT auth (Cursor-style)", async () => {
    await useTemporaryWorkingDirectory();
    const env = {
      [SNOWFLAKE_MCP_URL_ENV]: EXAMPLE_MCP_URL,
      [SNOWFLAKE_PAT_TOKEN_ENV]: "pat-token",
    };
    expect(getChatConnectionProvider("snowflake", env)).toMatchObject({
      name: "snowflake",
      displayName: "Snowflake",
      mcpUrl: EXAMPLE_MCP_URL,
      authKind: "pat",
      patTokenEnv: SNOWFLAKE_PAT_TOKEN_ENV,
      mcpUrlEnv: SNOWFLAKE_MCP_URL_ENV,
    });
    expect(getChatConnectionProvider("snowflake", env)?.clientIdEnv).toBeUndefined();
    expect(getChatConnectionProvider("snowflake", env)?.registrationEndpoint).toBeUndefined();
  });

  it("requires MCP URL and PAT before ready", async () => {
    await useTemporaryWorkingDirectory();
    await expect(getProviderCredentialSetupError(createSnowflakeProvider({}), {})).resolves.toMatch(
      /MCP server URL/,
    );

    await writeStoredAppCredentials("snowflake", {
      accessToken: "pat-token",
      mcpUrl: EXAMPLE_MCP_URL,
    });
    await expect(
      getProviderCredentialSetupError(createSnowflakeProvider({}), {}),
    ).resolves.toBeNull();
  });

  it("reports connected after PAT setup without OAuth Connect", async () => {
    await useTemporaryWorkingDirectory();
    await writeStoredAppCredentials("snowflake", {
      accessToken: "pat-token",
      mcpUrl: EXAMPLE_MCP_URL,
    });
    const status = await resolveConnectionAuthStatus(createSnowflakeProvider({}));
    expect(status).toMatchObject({
      id: "snowflake",
      status: "connected",
      configurable: true,
    });
  });

  it("requires approval for all Snowflake tools", () => {
    const provider = createSnowflakeProvider({
      [SNOWFLAKE_MCP_URL_ENV]: EXAMPLE_MCP_URL,
    });
    expect(
      approvalForTool("snowflake", provider.safeReadOnlyTools, "snowflake__business_data_agent"),
    ).toBe("user-approval");
    expect(
      approvalForTool("snowflake", provider.safeReadOnlyTools, "snowflake__sql_exec_tool"),
    ).toBe("user-approval");
  });
});
