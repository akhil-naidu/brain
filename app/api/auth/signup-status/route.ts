import { NextResponse } from "next/server";
import { isBootstrapAllowed } from "@/lib/auth/bootstrap";
import { resolveLicenseEntitlements } from "@/lib/auth/license";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET() {
  await ensureAuthReady();
  const bootstrapAllowed = isBootstrapAllowed();
  const policies = getWorkspaceStore().getPolicies();
  const openSignupAllowed = !bootstrapAllowed && policies.signupMode === "open";
  const entitlements = await resolveLicenseEntitlements();
  const ssoAvailable = entitlements.sso;
  return NextResponse.json({
    signupMode: policies.signupMode,
    openSignupAllowed,
    bootstrapAllowed,
    ssoAvailable,
  });
}
