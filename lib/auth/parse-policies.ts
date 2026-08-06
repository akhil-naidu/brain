import type { InstancePolicies, SignupMode } from "@/lib/auth/workspaces/types";

function parseSignupMode(value: unknown): SignupMode {
  if (value === "open" || value === "invite-only" || value === "sso-only") {
    return value;
  }
  return "invite-only";
}

export function parseInstancePolicies(value: unknown): InstancePolicies | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  return {
    signupMode: parseSignupMode("signupMode" in value ? value.signupMode : undefined),
    autoPersonalWorkspace:
      "autoPersonalWorkspace" in value ? Boolean(value.autoPersonalWorkspace) : false,
    allowCreateWorkspace:
      "allowCreateWorkspace" in value ? Boolean(value.allowCreateWorkspace) : false,
  };
}
