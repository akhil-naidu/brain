import { NextResponse } from "next/server";
import { listChatConnectionStatuses } from "@/agent/lib/connection-status";
import { brainUserPrincipal } from "@/lib/auth/principal";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  const connections = await listChatConnectionStatuses(
    brainUserPrincipal(session.session.userId, session.session.workspaceId),
  );
  return NextResponse.json({ connections });
}
