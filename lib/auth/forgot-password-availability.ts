import { isSmtpConfigured } from "@/lib/auth/email/smtp";
import type { InstancePolicies } from "@/lib/auth/workspaces/types";

export type ForgotPasswordAvailability = {
  readonly allowForgotPassword: boolean;
  readonly smtpConfigured: boolean;
  readonly forgotPasswordAvailable: boolean;
};

/**
 * UI may offer forgot-password when policy allows it and the host is not SSO-only.
 * Actual email send still requires SMTP (API returns a clear 503 when missing).
 */
export function resolveForgotPasswordAvailability(
  policies: InstancePolicies,
  env: Record<string, string | undefined> = process.env,
): ForgotPasswordAvailability {
  const smtpConfigured = isSmtpConfigured(env);
  return {
    allowForgotPassword: policies.allowForgotPassword,
    smtpConfigured,
    forgotPasswordAvailable: policies.allowForgotPassword && policies.signupMode !== "sso-only",
  };
}
