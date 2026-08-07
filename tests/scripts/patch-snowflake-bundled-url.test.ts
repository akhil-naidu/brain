import { describe, expect, it } from "vitest";
import {
  replaceSnowflakeUrlInBundledSource,
  SNOWFLAKE_PLACEHOLDER_MCP_URL,
} from "../../scripts/patch-snowflake-bundled-url.mjs";

const ACCOUNT_URL =
  "https://myorg-myaccount.snowflakecomputing.com/api/v2/databases/ANALYTICS/schemas/MCP/mcp-servers/BUSINESS_AGENT";

describe("replaceSnowflakeUrlInBundledSource", () => {
  it("rewrites the snowflake connection url in a pretty-printed manifest", () => {
    const source = `
const manifest = {
  "connections": [
    {
      "connectionName": "slack",
      "url": "https://mcp.slack.com/mcp"
    },
    {
      "connectionName": "snowflake",
      "protocol": "mcp",
      "url": "${SNOWFLAKE_PLACEHOLDER_MCP_URL}"
    }
  ]
};
`;
    const next = replaceSnowflakeUrlInBundledSource(source, ACCOUNT_URL);
    expect(next).toContain(ACCOUNT_URL);
    expect(next).not.toContain(SNOWFLAKE_PLACEHOLDER_MCP_URL);
    expect(next).toContain("https://mcp.slack.com/mcp");
  });

  it("falls back to replacing the unique placeholder", () => {
    const source = `url: "${SNOWFLAKE_PLACEHOLDER_MCP_URL}"`;
    expect(replaceSnowflakeUrlInBundledSource(source, ACCOUNT_URL)).toBe(`url: "${ACCOUNT_URL}"`);
  });
});
