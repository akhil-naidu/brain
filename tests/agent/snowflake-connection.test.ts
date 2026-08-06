import { describe, expect, it } from "vitest";
import {
  createSnowflakeProvider,
  SNOWFLAKE_MCP_CLIENT_ID_ENV,
  SNOWFLAKE_MCP_CLIENT_SECRET_ENV,
  SNOWFLAKE_MCP_URL_ENV,
} from "@/agent/connections/snowflake";
import { approvalForTool } from "@/agent/lib/define-mcp-oauth-connection";
import { getProviderCredentialSetupError } from "@/agent/lib/connection-credentials";
import { getChatConnectionProvider } from "@/agent/lib/connection-status";

const EXAMPLE_MCP_URL =
  "https://myorg-myaccount.snowflakecomputing.com/api/v2/databases/ANALYTICS/schemas/MCP/mcp-servers/BUSINESS_AGENT";

describe("Snowflake MCP connection", () => {
  it("is registered for chat status and Connect", () => {
    const env = {
      [SNOWFLAKE_MCP_URL_ENV]: EXAMPLE_MCP_URL,
      [SNOWFLAKE_MCP_CLIENT_ID_ENV]: "client-id",
      [SNOWFLAKE_MCP_CLIENT_SECRET_ENV]: "client-secret",
    };
    expect(getChatConnectionProvider("snowflake", env)).toMatchObject({
      name: "snowflake",
      displayName: "Snowflake",
      mcpUrl: EXAMPLE_MCP_URL,
      authorizationEndpoint: "https://myorg-myaccount.snowflakecomputing.com/oauth/authorize",
      tokenEndpoint: "https://myorg-myaccount.snowflakecomputing.com/oauth/token-request",
      tokenAuthMethod: "client_secret_post",
      clientIdEnv: SNOWFLAKE_MCP_CLIENT_ID_ENV,
      clientSecretEnv: SNOWFLAKE_MCP_CLIENT_SECRET_ENV,
      mcpUrlEnv: SNOWFLAKE_MCP_URL_ENV,
      includeResourceIndicator: false,
      scope: "session:role:all",
    });
    expect(getChatConnectionProvider("snowflake", env)?.registrationEndpoint).toBeUndefined();
  });

  it("derives OAuth endpoints from the MCP URL origin", () => {
    const provider = createSnowflakeProvider({
      [SNOWFLAKE_MCP_URL_ENV]: EXAMPLE_MCP_URL,
    });
    expect(provider.authorizationEndpoint).toBe(
      "https://myorg-myaccount.snowflakecomputing.com/oauth/authorize",
    );
    expect(provider.tokenEndpoint).toBe(
      "https://myorg-myaccount.snowflakecomputing.com/oauth/token-request",
    );
  });

  it("requires MCP URL before Connect", async () => {
    await expect(getProviderCredentialSetupError(createSnowflakeProvider({}), {})).resolves.toMatch(
      /SNOWFLAKE_MCP_URL/,
    );
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
