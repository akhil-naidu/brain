import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    workspaceId: z.string().trim().min(1),
  })
  .strict();

export async function PUT(request: Request) {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  await ensureAuthReady();
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

  const workspaces = getWorkspaceStore();
  try {
    workspaces.setActiveWorkspaceId(session.userId, parsed.data.workspaceId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to switch workspace.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
  const workspace = workspaces.getWorkspace(parsed.data.workspaceId);
  return NextResponse.json({ workspace });
}
