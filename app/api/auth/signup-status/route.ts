import { NextResponse } from "next/server";
import { isBootstrapAllowed } from "@/lib/auth/bootstrap";
import { resolveForgotPasswordAvailability } from "@/lib/auth/forgot-password-availability";
import { resolveLicenseEntitlements } from "@/lib/auth/license";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET() {
  await ensureAuthReady();
  const bootstrapAllowed = await isBootstrapAllowed();
  const policies = await getWorkspaceStore().getPolicies();
  const openSignupAllowed = !bootstrapAllowed && policies.signupMode === "open";
  const entitlements = await resolveLicenseEntitlements();
  const ssoAvailable = entitlements.sso;
  const forgot = resolveForgotPasswordAvailability(policies);
  return NextResponse.json({
    signupMode: policies.signupMode,
    openSignupAllowed,
    bootstrapAllowed,
    ssoAvailable,
    allowForgotPassword: forgot.allowForgotPassword,
    smtpConfigured: forgot.smtpConfigured,
    forgotPasswordAvailable: forgot.forgotPasswordAvailable,
  });
}
