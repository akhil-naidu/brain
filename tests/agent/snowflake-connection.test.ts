import { describe, expect, it } from "vitest";
import {
  SNOWFLAKE_CONNECTION_NAME,
  SNOWFLAKE_SAFE_READ_ONLY_TOOLS,
} from "@/agent/connections/snowflake";
import { approvalForTool } from "@/agent/lib/define-mcp-oauth-connection";
import {
  getSnowflakePatSetupError,
  parseSnowflakeMcpServerUrl,
  resolveSnowflakePatToken,
} from "@/agent/lib/snowflake-mcp-url";

describe("parseSnowflakeMcpServerUrl", () => {
  it("accepts a Snowflake-managed MCP server URL", () => {
    const parsed = parseSnowflakeMcpServerUrl(
      "https://myorg-acct.snowflakecomputing.com/api/v2/databases/ANALYTICS/schemas/MCP/mcp-servers/brain_mcp/",
    );
    expect(parsed).toEqual({
      mcpUrl:
        "https://myorg-acct.snowflakecomputing.com/api/v2/databases/ANALYTICS/schemas/MCP/mcp-servers/brain_mcp",
      origin: "https://myorg-acct.snowflakecomputing.com",
    });
  });

  it("rejects missing, http, or non-Snowflake hosts", () => {
    expect(parseSnowflakeMcpServerUrl(undefined)).toBeNull();
    expect(
      parseSnowflakeMcpServerUrl(
        "http://myorg-acct.snowflakecomputing.com/api/v2/.../mcp-servers/x",
      ),
    ).toBeNull();
    expect(parseSnowflakeMcpServerUrl("https://example.com/mcp-servers/x")).toBeNull();
    expect(
      parseSnowflakeMcpServerUrl("https://myorg-acct.snowflakecomputing.com/api/v2/databases/x"),
    ).toBeNull();
  });
});

describe("Snowflake PAT setup", () => {
  it("requires MCP server URL and PAT token", () => {
    expect(getSnowflakePatSetupError({})).toMatch(/SNOWFLAKE_MCP_SERVER_URL/);
    expect(
      getSnowflakePatSetupError({
        SNOWFLAKE_MCP_SERVER_URL:
          "https://myorg-acct.snowflakecomputing.com/api/v2/databases/DB/schemas/S/mcp-servers/mcp",
      }),
    ).toMatch(/SNOWFLAKE_PAT_TOKEN/);
    expect(
      getSnowflakePatSetupError({
        SNOWFLAKE_MCP_SERVER_URL:
          "https://myorg-acct.snowflakecomputing.com/api/v2/databases/DB/schemas/S/mcp-servers/mcp",
        SNOWFLAKE_PAT_TOKEN: " pat ",
      }),
    ).toBeNull();
    expect(resolveSnowflakePatToken({ SNOWFLAKE_PAT_TOKEN: " pat " })).toBe("pat");
  });

  it("requires approval for Snowflake tools by default", () => {
    expect(
      approvalForTool(
        SNOWFLAKE_CONNECTION_NAME,
        SNOWFLAKE_SAFE_READ_ONLY_TOOLS,
        "snowflake__run_snowflake_query",
      ),
    ).toBe("user-approval");
  });
});
