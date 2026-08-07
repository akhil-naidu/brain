import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSignupModeAllowed, resolveLicenseEntitlements } from "@/lib/auth/license";
import { isOperatorUserId } from "@/lib/auth/require-operator-session";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    signupMode: z.enum(["open", "invite-only", "sso-only"]).optional(),
    autoPersonalWorkspace: z.boolean().optional(),
    allowCreateWorkspace: z.boolean().optional(),
    allowForgotPassword: z.boolean().optional(),
  })
  .strict();

export async function GET() {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  await ensureAuthReady();
  const workspaces = getWorkspaceStore();
  return NextResponse.json({
    policies: await workspaces.getPolicies(),
    canManage: await isOperatorUserId(session.userId),
  });
}

export async function PUT(request: Request) {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  await ensureAuthReady();
  if (!(await isOperatorUserId(session.userId))) {
    return NextResponse.json(
      { error: "Only the instance admin can update policies." },
      { status: 403 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  try {
    const entitlements = await resolveLicenseEntitlements();
    if (parsed.data.signupMode) {
      assertSignupModeAllowed(entitlements, parsed.data.signupMode);
    }
    if (parsed.data.allowCreateWorkspace === true && !entitlements.multiWorkspace) {
      return NextResponse.json(
        { error: "This license does not allow creating additional workspaces." },
        { status: 403 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "License does not allow this policy.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
  const policies = await getWorkspaceStore().updatePolicies(parsed.data);
  return NextResponse.json({ policies });
}
