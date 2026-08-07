import { NextResponse } from "next/server";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

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
  await ensureAuthReady();
  try {
    const revoked = await getWorkspaceStore().revokeInvite(
      session.session.workspaceId,
      id,
      session.session.userId,
    );
    if (!revoked) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to revoke invite.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
