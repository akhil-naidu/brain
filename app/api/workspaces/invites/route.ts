import { NextResponse } from "next/server";
import { z } from "zod";
import { isWorkspaceAdminRole } from "@/lib/auth/workspaces/types";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

const createBodySchema = z
  .object({
    email: z.string().email().optional(),
    role: z.enum(["admin", "member"]).optional(),
  })
  .strict();

export async function GET() {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  if (!isWorkspaceAdminRole(session.session.role)) {
    return NextResponse.json({ error: "Only workspace admins can list invites." }, { status: 403 });
  }
  await ensureAuthReady();
  const invites = getWorkspaceStore().listInvites(session.session.workspaceId);
  return NextResponse.json({ invites });
}

export async function POST(request: Request) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  await ensureAuthReady();
  try {
    const invite = getWorkspaceStore().createInvite({
      workspaceId: session.session.workspaceId,
      createdByUserId: session.session.userId,
      email: parsed.data.email,
      role: parsed.data.role,
    });
    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create invite.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
