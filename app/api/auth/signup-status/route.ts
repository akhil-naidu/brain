import { NextResponse } from "next/server";
import { isBootstrapAllowed } from "@/lib/auth/bootstrap";
import { resolveLicenseEntitlements } from "@/lib/auth/license";
import { oidcCallbackPath, resolveOidcEnvConfig } from "@/lib/auth/oidc";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET() {
  await ensureAuthReady();
  const bootstrapAllowed = isBootstrapAllowed();
  const policies = getWorkspaceStore().getPolicies();
  const openSignupAllowed = !bootstrapAllowed && policies.signupMode === "open";
  const oidc = resolveOidcEnvConfig();
  const entitlements = await resolveLicenseEntitlements();
  const ssoAvailable = Boolean(oidc && entitlements.sso);
  return NextResponse.json({
    signupMode: policies.signupMode,
    openSignupAllowed,
    bootstrapAllowed,
    ssoAvailable,
    ssoProviderId: ssoAvailable && oidc ? oidc.providerId : null,
    ssoCallbackPath: ssoAvailable && oidc ? oidcCallbackPath(oidc.providerId) : null,
  });
}
