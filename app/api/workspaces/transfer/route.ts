import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    userId: z.string().trim().min(1),
  })
  .strict();

export async function POST(request: Request) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide the user id of the new owner." }, { status: 400 });
  }

  await ensureAuthReady();
  try {
    getWorkspaceStore().transferOwnership({
      workspaceId: session.session.workspaceId,
      actorUserId: session.session.userId,
      targetUserId: parsed.data.userId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to transfer ownership.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
