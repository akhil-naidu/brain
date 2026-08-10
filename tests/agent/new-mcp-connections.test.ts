import { describe, expect, it } from "vitest";
import { atlassianProvider } from "@/agent/connections/atlassian";
import { linearProvider } from "@/agent/connections/linear";
import { notionProvider } from "@/agent/connections/notion";
import { sentryProvider } from "@/agent/connections/sentry";
import { zernioProvider } from "@/agent/connections/zernio";
import { approvalForTool } from "@/agent/lib/define-mcp-oauth-connection";
import { getChatConnectionProvider } from "@/agent/lib/connection-status";

describe("new official MCP connections", () => {
  it("registers Notion with hosted MCP + DCR", () => {
    expect(getChatConnectionProvider("notion")).toMatchObject({
      name: "notion",
      mcpUrl: "https://mcp.notion.com/mcp",
      resource: "https://mcp.notion.com/mcp",
      scope: "default",
      registrationEndpoint: "https://mcp.notion.com/register",
      tokenAuthMethod: "none",
    });
    expect(
      approvalForTool("notion", notionProvider.safeReadOnlyTools, "notion__notion-search"),
    ).toBe("not-applicable");
    expect(
      approvalForTool("notion", notionProvider.safeReadOnlyTools, "notion__notion-create-pages"),
    ).toBe("user-approval");
  });

  it("registers Zernio with hosted MCP + DCR", () => {
    expect(getChatConnectionProvider("zernio")).toMatchObject({
      name: "zernio",
      mcpUrl: "https://mcp.zernio.com/mcp",
      resource: "https://mcp.zernio.com/mcp",
      registrationEndpoint: "https://zernio.com/api/oauth/register",
      tokenAuthMethod: "none",
    });
    expect(
      approvalForTool("zernio", zernioProvider.safeReadOnlyTools, "zernio__accounts_list"),
    ).toBe("not-applicable");
    expect(
      approvalForTool("zernio", zernioProvider.safeReadOnlyTools, "zernio__posts_publish_now"),
    ).toBe("user-approval");
  });

  it("registers Linear with hosted MCP + DCR", () => {
    expect(getChatConnectionProvider("linear")).toMatchObject({
      name: "linear",
      mcpUrl: "https://mcp.linear.app/mcp",
      resource: "https://mcp.linear.app/mcp",
      scope: "read write",
      registrationEndpoint: "https://mcp.linear.app/register",
      tokenAuthMethod: "none",
    });
    expect(approvalForTool("linear", linearProvider.safeReadOnlyTools, "linear__list_issues")).toBe(
      "not-applicable",
    );
    expect(approvalForTool("linear", linearProvider.safeReadOnlyTools, "linear__save_issue")).toBe(
      "user-approval",
    );
  });

  it("registers Sentry with hosted MCP + DCR", () => {
    expect(getChatConnectionProvider("sentry")).toMatchObject({
      name: "sentry",
      mcpUrl: "https://mcp.sentry.dev/mcp",
      resource: "https://mcp.sentry.dev/mcp",
      registrationEndpoint: "https://mcp.sentry.dev/oauth/register",
      tokenAuthMethod: "none",
    });
    expect(approvalForTool("sentry", sentryProvider.safeReadOnlyTools, "sentry__whoami")).toBe(
      "not-applicable",
    );
    expect(
      approvalForTool("sentry", sentryProvider.safeReadOnlyTools, "sentry__create_project"),
    ).toBe("user-approval");
  });

  it("registers Atlassian Rovo MCP with authv2 + DCR", () => {
    expect(getChatConnectionProvider("atlassian")).toMatchObject({
      name: "atlassian",
      mcpUrl: "https://mcp.atlassian.com/v1/mcp/authv2",
      resource: "https://mcp.atlassian.com/v1/mcp/authv2",
      registrationEndpoint: "https://cf.mcp.atlassian.com/v1/register",
      tokenAuthMethod: "none",
    });
    expect(
      approvalForTool(
        "atlassian",
        atlassianProvider.safeReadOnlyTools,
        "atlassian__getAccessibleAtlassianResources",
      ),
    ).toBe("not-applicable");
    expect(
      approvalForTool(
        "atlassian",
        atlassianProvider.safeReadOnlyTools,
        "atlassian__createJiraIssue",
      ),
    ).toBe("user-approval");
  });
});
