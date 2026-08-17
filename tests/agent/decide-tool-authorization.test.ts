import { describe, expect, it } from "vitest";
import { decideToolAuthorization } from "@/agent/lib/decide-tool-authorization";

const clickupRead = {
  toolKind: "connection" as const,
  toolName: "clickup__clickup_get_task",
  isSafeRead: true,
};

const clickupWrite = {
  toolKind: "connection" as const,
  toolName: "clickup__clickup_create_task",
  isSafeRead: false,
  args: { name: "Task" },
};

const bashLs = {
  toolKind: "bash" as const,
  toolName: "bash",
  isSafeRead: false,
  args: { command: "ls -la /workspace" },
};

const bashRm = {
  toolKind: "bash" as const,
  toolName: "bash",
  isSafeRead: false,
  args: { command: "rm -rf /tmp/workspace" },
};

describe("decideToolAuthorization", () => {
  it("Ask denies connection tools even in Dangerous", () => {
    const decision = decideToolAuthorization({
      mode: "ask",
      posture: "dangerous",
      unattended: false,
      ...clickupRead,
    });
    expect(decision).toMatchObject({ type: "denied" });
  });

  it("Plan denies mutating connection tools even in Dangerous", () => {
    const decision = decideToolAuthorization({
      mode: "plan",
      posture: "dangerous",
      unattended: false,
      ...clickupWrite,
    });
    expect(decision).toMatchObject({ type: "denied" });
  });

  it("Plan denies bash even in Dangerous", () => {
    const decision = decideToolAuthorization({
      mode: "plan",
      posture: "dangerous",
      unattended: false,
      ...bashLs,
    });
    expect(decision).toMatchObject({ type: "denied" });
  });

  it("Strict requires approval for a reviewed read", () => {
    expect(
      decideToolAuthorization({
        mode: "agent",
        posture: "strict",
        unattended: false,
        ...clickupRead,
      }),
    ).toBe("user-approval");
  });

  it("Auto skips a reviewed read and pauses a write", () => {
    expect(
      decideToolAuthorization({
        mode: "agent",
        posture: "auto",
        unattended: false,
        ...clickupRead,
      }),
    ).toBe("not-applicable");
    expect(
      decideToolAuthorization({
        mode: "agent",
        posture: "auto",
        unattended: false,
        ...clickupWrite,
      }),
    ).toBe("user-approval");
  });

  it("Dangerous skips write approval when policy allows", () => {
    expect(
      decideToolAuthorization({
        mode: "agent",
        posture: "dangerous",
        unattended: false,
        ...clickupWrite,
      }),
    ).toBe("not-applicable");
  });

  it("command policy denies rm -rf even in Dangerous", () => {
    const decision = decideToolAuthorization({
      mode: "agent",
      posture: "dangerous",
      unattended: false,
      ...bashRm,
    });
    expect(decision).toMatchObject({ type: "denied" });
  });

  it("unattended Strict does not pause a reviewed read", () => {
    expect(
      decideToolAuthorization({
        mode: "agent",
        posture: "strict",
        unattended: true,
        ...clickupRead,
      }),
    ).toBe("not-applicable");
  });

  it("unattended still denies DROP TABLE", () => {
    const decision = decideToolAuthorization({
      mode: "agent",
      posture: "strict",
      unattended: true,
      toolKind: "connection",
      toolName: "snowflake__sql",
      isSafeRead: false,
      args: { statement: "DROP TABLE accounts" },
    });
    expect(decision).toMatchObject({ type: "denied" });
  });

  it("Auto bash does not require HITL when policy allows", () => {
    expect(
      decideToolAuthorization({
        mode: "agent",
        posture: "auto",
        unattended: false,
        ...bashLs,
      }),
    ).toBe("not-applicable");
  });

  it("Strict bash requires HITL when policy allows", () => {
    expect(
      decideToolAuthorization({
        mode: "agent",
        posture: "strict",
        unattended: false,
        ...bashLs,
      }),
    ).toBe("user-approval");
  });
});
