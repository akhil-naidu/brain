import { describe, expect, it } from "vitest";
import { evaluateCommandPolicy } from "@/agent/lib/command-policy";

describe("evaluateCommandPolicy", () => {
  it("allows harmless listing", () => {
    expect(
      evaluateCommandPolicy({ toolName: "bash", args: { command: "ls -la /workspace" } }),
    ).toBe("allow");
  });

  it("allows SELECT", () => {
    expect(
      evaluateCommandPolicy({
        toolName: "snowflake__run_sql",
        args: { statement: "SELECT 1 FROM accounts" },
      }),
    ).toBe("allow");
  });

  it("allows normal ClickUp create args", () => {
    expect(
      evaluateCommandPolicy({
        toolName: "clickup__clickup_create_task",
        args: { name: "Ship brief", description: "Write the morning brief" },
      }),
    ).toBe("allow");
  });

  it("denies recursive rm -rf", () => {
    expect(
      evaluateCommandPolicy({ toolName: "bash", args: { command: "rm -rf /tmp/workspace" } }),
    ).toBe("deny");
  });

  it("denies rm -fr and recursive long flags", () => {
    expect(evaluateCommandPolicy({ toolName: "bash", args: { command: "rm -fr ./out" } })).toBe(
      "deny",
    );
    expect(
      evaluateCommandPolicy({
        toolName: "bash",
        args: { command: "rm --recursive --force ./out" },
      }),
    ).toBe("deny");
  });

  it("denies mkfs, dd to /dev, and fork bomb", () => {
    expect(
      evaluateCommandPolicy({ toolName: "bash", args: { command: "mkfs.ext4 /dev/sda" } }),
    ).toBe("deny");
    expect(
      evaluateCommandPolicy({ toolName: "bash", args: { command: "dd if=/dev/zero of=/dev/sda" } }),
    ).toBe("deny");
    expect(evaluateCommandPolicy({ toolName: "bash", args: { command: ":(){ :|:& };:" } })).toBe(
      "deny",
    );
  });

  it("denies DROP TABLE in bash and Snowflake args", () => {
    expect(
      evaluateCommandPolicy({
        toolName: "bash",
        args: { command: "psql -c 'DROP TABLE accounts'" },
      }),
    ).toBe("deny");
    expect(
      evaluateCommandPolicy({
        toolName: "snowflake__sql",
        args: { statement: "DROP TABLE accounts" },
      }),
    ).toBe("deny");
  });

  it("denies Mongo drop-collection by name", () => {
    expect(evaluateCommandPolicy({ toolName: "mongodb__drop-collection", args: {} })).toBe("deny");
  });

  it("does not treat backdrop as DROP", () => {
    expect(
      evaluateCommandPolicy({
        toolName: "clickup__clickup_create_task",
        args: { name: "Fix backdrop blur" },
      }),
    ).toBe("allow");
  });
});
