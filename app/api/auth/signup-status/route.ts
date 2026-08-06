import { NextResponse } from "next/server";
import { isBootstrapAllowed } from "@/lib/auth/bootstrap";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET() {
  await ensureAuthReady();
  const bootstrapAllowed = isBootstrapAllowed();
  const policies = getWorkspaceStore().getPolicies();
  const openSignupAllowed = !bootstrapAllowed && policies.signupMode === "open";
  return NextResponse.json({
    signupMode: policies.signupMode,
    openSignupAllowed,
    bootstrapAllowed,
  });
}
