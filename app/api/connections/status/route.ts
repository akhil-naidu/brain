import { NextResponse } from "next/server";
import { listChatConnectionStatuses } from "@/agent/lib/connection-status";
import { brainUserPrincipal } from "@/lib/auth/principal";
import { isOperatorUserId } from "@/lib/auth/require-operator-session";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { isWorkspaceAdminRole } from "@/lib/auth/workspaces/types";
import { connectionNeedsStaticAppCredentials } from "@/lib/chat/connection-catalog";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  const canManageWorkspaceApps = isWorkspaceAdminRole(session.session.role);
  const canManageHostApps = await isOperatorUserId(session.session.userId);
  const canConfigureAppCredentials = canManageWorkspaceApps || canManageHostApps;

  const connections = (
    await listChatConnectionStatuses(
      brainUserPrincipal(session.session.userId, session.session.workspaceId),
    )
  ).map((connection) =>
    Object.assign({}, connection, {
      canConfigureApp:
        connectionNeedsStaticAppCredentials(connection.id) && canConfigureAppCredentials,
    }),
  );

  return NextResponse.json({ connections });
}
