import { describe, expect, it } from "vitest";
import { parseInstancePolicies } from "@/lib/auth/parse-policies";

describe("parseInstancePolicies", () => {
  it("defaults allowForgotPassword to true when omitted", () => {
    const parsed = parseInstancePolicies({
      signupMode: "open",
      autoPersonalWorkspace: true,
      allowCreateWorkspace: false,
    });
    expect(parsed?.allowForgotPassword).toBe(true);
  });

  it("reads allowForgotPassword when present", () => {
    const parsed = parseInstancePolicies({
      signupMode: "invite-only",
      autoPersonalWorkspace: false,
      allowCreateWorkspace: true,
      allowForgotPassword: false,
    });
    expect(parsed?.allowForgotPassword).toBe(false);
  });
});
