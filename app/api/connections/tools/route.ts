import { NextResponse } from "next/server";
import { buildMcpToolsCatalog } from "@/agent/lib/mcp-tools-catalog";
import { brainUserPrincipal } from "@/lib/auth/principal";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }

  try {
    const catalog = await buildMcpToolsCatalog(
      brainUserPrincipal(session.session.userId, session.session.workspaceId),
    );
    return NextResponse.json(catalog);
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "Unable to load MCP tools catalog.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
