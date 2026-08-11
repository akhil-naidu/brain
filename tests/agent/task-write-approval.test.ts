import { describe, expect, it } from "vitest";
import { asanaProvider } from "@/agent/connections/asana";
import { clickupProvider } from "@/agent/connections/clickup";
import { linearProvider } from "@/agent/connections/linear";
import { approvalForTool } from "@/agent/lib/define-mcp-oauth-connection";

describe("task and issue write approval", () => {
  it("requires approval for ClickUp task create/update; allows reviewed reads", () => {
    expect(
      approvalForTool("clickup", clickupProvider.safeReadOnlyTools, "clickup__clickup_get_task"),
    ).toBe("not-applicable");
    expect(
      approvalForTool(
        "clickup",
        clickupProvider.safeReadOnlyTools,
        "clickup__clickup_filter_tasks",
      ),
    ).toBe("not-applicable");
    expect(
      approvalForTool("clickup", clickupProvider.safeReadOnlyTools, "clickup__clickup_create_task"),
    ).toBe("user-approval");
    expect(
      approvalForTool("clickup", clickupProvider.safeReadOnlyTools, "clickup__clickup_update_task"),
    ).toBe("user-approval");
    expect(
      approvalForTool("clickup", clickupProvider.safeReadOnlyTools, "clickup__clickup_delete_task"),
    ).toBe("user-approval");
  });

  it("requires approval for Linear issue writes; allows reviewed reads", () => {
    expect(approvalForTool("linear", linearProvider.safeReadOnlyTools, "linear__list_issues")).toBe(
      "not-applicable",
    );
    expect(approvalForTool("linear", linearProvider.safeReadOnlyTools, "linear__save_issue")).toBe(
      "user-approval",
    );
  });

  it("requires approval for Asana task writes; allows reviewed reads", () => {
    expect(approvalForTool("asana", asanaProvider.safeReadOnlyTools, "asana__get_task")).toBe(
      "not-applicable",
    );
    expect(approvalForTool("asana", asanaProvider.safeReadOnlyTools, "asana__search_tasks")).toBe(
      "not-applicable",
    );
    expect(approvalForTool("asana", asanaProvider.safeReadOnlyTools, "asana__create_task")).toBe(
      "user-approval",
    );
    expect(approvalForTool("asana", asanaProvider.safeReadOnlyTools, "asana__update_task")).toBe(
      "user-approval",
    );
  });

  it("fails closed for unknown work tools", () => {
    expect(
      approvalForTool("clickup", clickupProvider.safeReadOnlyTools, "clickup__totally_new_write"),
    ).toBe("user-approval");
  });

  it("denies all connection tools in Ask mode", () => {
    const decision = approvalForTool(
      "clickup",
      clickupProvider.safeReadOnlyTools,
      "clickup__clickup_get_task",
      "ask",
    );
    expect(decision).toMatchObject({ type: "denied" });
    if (typeof decision === "object" && decision.type === "denied") {
      expect(decision.reason).toMatch(/ask mode/i);
    }
  });
});
