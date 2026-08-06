import { describe, expect, it } from "vitest";
import { zernioProvider } from "@/agent/connections/zernio";
import { approvalForTool } from "@/agent/lib/define-mcp-oauth-connection";
import { getChatConnectionProvider } from "@/agent/lib/connection-status";

describe("Zernio MCP connection", () => {
  it("is registered for chat status and Connect", () => {
    expect(getChatConnectionProvider("zernio")).toMatchObject({
      name: "zernio",
      displayName: "Zernio",
      mcpUrl: "https://mcp.zernio.com/mcp",
      resource: "https://mcp.zernio.com/mcp",
      authorizationEndpoint: "https://zernio.com/oauth/authorize",
      tokenEndpoint: "https://zernio.com/api/oauth/token",
      registrationEndpoint: "https://zernio.com/api/oauth/register",
      tokenAuthMethod: "none",
    });
    expect(getChatConnectionProvider("zernio")?.clientIdEnv).toBeUndefined();
  });

  it("auto-approves reviewed read tools and requires approval for writes", () => {
    expect(
      approvalForTool("zernio", zernioProvider.safeReadOnlyTools, "zernio__accounts_list"),
    ).toBe("not-applicable");
    expect(approvalForTool("zernio", zernioProvider.safeReadOnlyTools, "zernio__posts_list")).toBe(
      "not-applicable",
    );
    expect(
      approvalForTool("zernio", zernioProvider.safeReadOnlyTools, "zernio__search_tools"),
    ).toBe("not-applicable");
    expect(
      approvalForTool("zernio", zernioProvider.safeReadOnlyTools, "zernio__posts_create"),
    ).toBe("user-approval");
    expect(
      approvalForTool("zernio", zernioProvider.safeReadOnlyTools, "zernio__posts_publish_now"),
    ).toBe("user-approval");
    expect(approvalForTool("zernio", zernioProvider.safeReadOnlyTools, "zernio__call_tool")).toBe(
      "user-approval",
    );
  });
});
