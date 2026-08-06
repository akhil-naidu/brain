import { NextResponse } from "next/server";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { getUserDataStore } from "@/lib/chat/user-data/sqlite-user-data-store";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    return auth.response;
  }
  const { id } = await context.params;
  const deleted = getUserDataStore().deletePlaybook(auth.session.workspaceId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Playbook not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
