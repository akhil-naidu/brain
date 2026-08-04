import { describe, expect, it } from "vitest";
import { dflowProvider } from "@/agent/connections/dflow";
import { approvalForTool } from "@/agent/lib/define-mcp-oauth-connection";
import { getChatConnectionProvider } from "@/agent/lib/connection-status";

describe("dFlow MCP connection", () => {
  it("is registered for chat status and Connect", () => {
    expect(getChatConnectionProvider("dflow")).toMatchObject({
      name: "dflow",
      displayName: "dFlow",
      mcpUrl: "https://app.dflow.sh/api/mcp",
      resource: "https://app.dflow.sh",
      scope: "mcp",
      tokenAuthMethod: "none",
      registrationEndpoint: "https://app.dflow.sh/api/oauth/register",
    });
  });

  it("auto-approves reviewed read tools and requires approval for writes", () => {
    expect(
      approvalForTool("dflow", dflowProvider.safeReadOnlyTools, "dflow__list_applications"),
    ).toBe("not-applicable");
    expect(
      approvalForTool("dflow", dflowProvider.safeReadOnlyTools, "dflow__get_service_runtime_logs"),
    ).toBe("not-applicable");
    expect(
      approvalForTool("dflow", dflowProvider.safeReadOnlyTools, "dflow__create_template"),
    ).toBe("user-approval");
    expect(
      approvalForTool(
        "dflow",
        dflowProvider.safeReadOnlyTools,
        "dflow__prepare_github_app_registration",
      ),
    ).toBe("user-approval");
  });
});
