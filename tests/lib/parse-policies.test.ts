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

  it("defaults agentSafetyPosture to auto when omitted", () => {
    const parsed = parseInstancePolicies({
      signupMode: "open",
      autoPersonalWorkspace: true,
      allowCreateWorkspace: true,
    });
    expect(parsed?.agentSafetyPosture).toBe("auto");
  });

  it("reads agentSafetyPosture when present", () => {
    const parsed = parseInstancePolicies({
      signupMode: "invite-only",
      autoPersonalWorkspace: true,
      allowCreateWorkspace: true,
      agentSafetyPosture: "strict",
    });
    expect(parsed?.agentSafetyPosture).toBe("strict");
  });

  it("falls unknown agentSafetyPosture back to auto", () => {
    const parsed = parseInstancePolicies({
      signupMode: "invite-only",
      autoPersonalWorkspace: true,
      allowCreateWorkspace: true,
      agentSafetyPosture: "yolo",
    });
    expect(parsed?.agentSafetyPosture).toBe("auto");
  });
});
