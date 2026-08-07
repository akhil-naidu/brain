import { describe, expect, it } from "vitest";
import { resolveForgotPasswordAvailability } from "@/lib/auth/forgot-password-availability";
import type { InstancePolicies } from "@/lib/auth/workspaces/types";

const basePolicies: InstancePolicies = {
  signupMode: "invite-only",
  autoPersonalWorkspace: true,
  allowCreateWorkspace: true,
  allowForgotPassword: true,
};

describe("resolveForgotPasswordAvailability", () => {
  it("requires policy and non-sso mode; SMTP is reported separately", () => {
    const withSmtp = {
      BRAIN_EMAIL_FROM: "brain@example.com",
      BRAIN_SMTP_HOST: "smtp.example.com",
      BRAIN_SMTP_PORT: "587",
    };

    expect(resolveForgotPasswordAvailability(basePolicies, withSmtp)).toMatchObject({
      forgotPasswordAvailable: true,
      smtpConfigured: true,
    });
    expect(
      resolveForgotPasswordAvailability({ ...basePolicies, allowForgotPassword: false }, withSmtp)
        .forgotPasswordAvailable,
    ).toBe(false);
    expect(
      resolveForgotPasswordAvailability({ ...basePolicies, signupMode: "sso-only" }, withSmtp)
        .forgotPasswordAvailable,
    ).toBe(false);
    expect(resolveForgotPasswordAvailability(basePolicies, {})).toMatchObject({
      forgotPasswordAvailable: true,
      smtpConfigured: false,
    });
  });
});
