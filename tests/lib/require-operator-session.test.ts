import { describe, expect, it } from "vitest";
import { isOperatorUserId } from "@/lib/auth/require-operator-session";

describe("isOperatorUserId", () => {
  it("matches BRAIN_OPERATOR_USER_ID when set", async () => {
    const env = { BRAIN_OPERATOR_USER_ID: "op-1" };
    expect(await isOperatorUserId("op-1", env)).toBe(true);
    expect(await isOperatorUserId("other", env)).toBe(false);
  });

  it("is false for a different user when operator is configured", async () => {
    expect(await isOperatorUserId("member-2", { BRAIN_OPERATOR_USER_ID: "op-1" })).toBe(false);
  });
});
