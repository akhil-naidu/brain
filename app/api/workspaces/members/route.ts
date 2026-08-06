import { NextResponse } from "next/server";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  await ensureAuthReady();
  const members = getWorkspaceStore().listMembers(session.session.workspaceId);
  return NextResponse.json({
    members,
    workspaceId: session.session.workspaceId,
    workspaceKind: session.session.workspace.kind,
    viewerUserId: session.session.userId,
    viewerRole: session.session.role,
  });
}
