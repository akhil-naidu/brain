import { NextResponse } from "next/server";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { getUserDataStore } from "@/lib/chat/user-data/sqlite-user-data-store";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  const { id } = await context.params;
  const deleted = getUserDataStore().deletePlaybook(session.userId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Playbook not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
