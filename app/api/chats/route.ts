import { NextResponse } from "next/server";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { getChatStore } from "@/lib/chat/store";
import { createChatBodySchema } from "@/lib/chat/store/parse";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  const statusParam = new URL(request.url).searchParams.get("status");
  const status = statusParam === "archived" ? "archived" : "active";
  const chats = await getChatStore().listChats(
    session.session.userId,
    session.session.workspaceId,
    { status },
  );
  return NextResponse.json({
    chats,
    canCreateShared: session.session.workspace.kind === "team",
    viewerUserId: session.session.userId,
  });
}

export async function POST(request: Request) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = createChatBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const visibility = parsed.data.visibility ?? "personal";
  if (visibility === "shared" && session.session.workspace.kind !== "team") {
    return NextResponse.json(
      { error: "Shared chats are only available in team workspaces." },
      { status: 400 },
    );
  }

  try {
    const chat = await getChatStore().createChat(session.session.userId, {
      id: parsed.data.id,
      title: parsed.data.title,
      workspaceId: session.session.workspaceId,
      visibility,
      projectId: parsed.data.projectId,
    });
    return NextResponse.json({ chat }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create chat.";
    if (message === "Project not found.") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }
}
