import { NextResponse } from "next/server";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.json({ error: "Missing invite token." }, { status: 400 });
  }
  await ensureAuthReady();
  const workspaces = getWorkspaceStore();
  const invite = await workspaces.getInviteByToken(token);
  if (!invite || invite.revokedAt) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }
  if (Date.parse(invite.expiresAt) < Date.now()) {
    return NextResponse.json({ valid: false, reason: "expired" }, { status: 410 });
  }
  const workspace = await workspaces.getWorkspace(invite.workspaceId);
  if (!workspace) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }
  return NextResponse.json({
    valid: true,
    workspaceName: workspace.name,
    email: invite.email,
    role: invite.role === "owner" ? "member" : invite.role,
    expiresAt: invite.expiresAt,
  });
}
