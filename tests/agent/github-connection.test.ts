import { describe, expect, it } from "vitest";
import { githubProvider } from "@/agent/connections/github";
import { approvalForTool } from "@/agent/lib/define-mcp-oauth-connection";
import { getChatConnectionProvider } from "@/agent/lib/connection-status";

describe("GitHub MCP connection", () => {
  it("is registered for chat status and Connect", () => {
    expect(getChatConnectionProvider("github")).toMatchObject({
      name: "github",
      displayName: "GitHub",
      mcpUrl: "https://api.githubcopilot.com/mcp/",
      resource: "https://api.githubcopilot.com/mcp/",
      tokenAuthMethod: "client_secret_post",
      clientIdEnv: "GITHUB_MCP_CLIENT_ID",
      clientSecretEnv: "GITHUB_MCP_CLIENT_SECRET",
      includeResourceIndicator: false,
    });
    expect(getChatConnectionProvider("github")?.registrationEndpoint).toBeUndefined();
  });

  it("auto-approves reviewed read tools and requires approval for writes", () => {
    expect(
      approvalForTool("github", githubProvider.safeReadOnlyTools, "github__search_repositories"),
    ).toBe("not-applicable");
    expect(
      approvalForTool("github", githubProvider.safeReadOnlyTools, "github__get_file_contents"),
    ).toBe("not-applicable");
    expect(
      approvalForTool("github", githubProvider.safeReadOnlyTools, "github__create_pull_request"),
    ).toBe("user-approval");
    expect(approvalForTool("github", githubProvider.safeReadOnlyTools, "github__push_files")).toBe(
      "user-approval",
    );
  });
});
