import { NextResponse } from "next/server";
import { disconnectMenuConnection } from "@/agent/lib/connection-authorize";
import { getChatConnectionProvider, isSnowflakeConnectionId } from "@/agent/lib/connection-status";
import { brainUserPrincipal } from "@/lib/auth/principal";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }

  const { id } = await context.params;
  if (isSnowflakeConnectionId(id)) {
    return NextResponse.json(
      {
        error:
          "Snowflake uses a workspace MCP URL and PAT — clear them in App settings instead of Disconnect.",
      },
      { status: 400 },
    );
  }
  const provider = getChatConnectionProvider(id);
  if (!provider) {
    return NextResponse.json({ error: "Unknown connection." }, { status: 404 });
  }

  const result = await disconnectMenuConnection(
    provider,
    brainUserPrincipal(session.session.userId, session.session.workspaceId),
  );
  return NextResponse.json({ ok: true, displayName: result.displayName });
}
