import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    role: z.enum(["admin", "member"]),
  })
  .strict();

type RouteContext = {
  readonly params: Promise<{ readonly userId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  const { userId: targetUserId } = await context.params;
  if (!targetUserId?.trim()) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Role must be admin or member." }, { status: 400 });
  }

  await ensureAuthReady();
  try {
    const member = await getWorkspaceStore().updateMemberRole({
      workspaceId: session.session.workspaceId,
      actorUserId: session.session.userId,
      targetUserId,
      role: parsed.data.role,
    });
    return NextResponse.json({ member });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update member.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  const { userId: targetUserId } = await context.params;
  if (!targetUserId?.trim()) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  await ensureAuthReady();
  try {
    await getWorkspaceStore().removeMember({
      workspaceId: session.session.workspaceId,
      actorUserId: session.session.userId,
      targetUserId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove member.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
