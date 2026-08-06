import { describe, expect, it } from "vitest";
import { isOperatorUserId } from "@/lib/auth/require-operator-session";

describe("isOperatorUserId", () => {
  it("matches BRAIN_OPERATOR_USER_ID when set", () => {
    const env = { BRAIN_OPERATOR_USER_ID: "op-1" };
    expect(isOperatorUserId("op-1", env)).toBe(true);
    expect(isOperatorUserId("other", env)).toBe(false);
  });

  it("is false for a different user when operator is configured", () => {
    expect(isOperatorUserId("member-2", { BRAIN_OPERATOR_USER_ID: "op-1" })).toBe(false);
  });
});
