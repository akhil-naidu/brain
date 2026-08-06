import { NextResponse } from "next/server";
import { z } from "zod";
import { isOperatorUserId } from "@/lib/auth/require-operator-session";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    signupMode: z.enum(["open", "invite-only", "sso-only"]).optional(),
    autoPersonalWorkspace: z.boolean().optional(),
    allowCreateWorkspace: z.boolean().optional(),
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
    policies: workspaces.getPolicies(),
    canManage: isOperatorUserId(session.userId),
  });
}

export async function PUT(request: Request) {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  await ensureAuthReady();
  if (!isOperatorUserId(session.userId)) {
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
  const policies = getWorkspaceStore().updatePolicies(parsed.data);
  return NextResponse.json({ policies });
}
