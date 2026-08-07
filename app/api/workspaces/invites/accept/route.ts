import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { ensureAuthReady, getAuth, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    token: z.string().trim().min(1),
  })
  .strict();

export async function POST(request: Request) {
  const session = await requireSessionUserId();
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
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  await ensureAuthReady();
  const authSession = await getAuth().api.getSession({ headers: request.headers });
  const email = authSession?.user?.email?.trim().toLowerCase() ?? "";
  try {
    const workspaces = getWorkspaceStore();
    const workspace = await workspaces.acceptInvite(parsed.data.token, session.userId, email);
    await workspaces.setActiveWorkspaceId(session.userId, workspace.id);
    return NextResponse.json({ workspace });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to accept invite.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
