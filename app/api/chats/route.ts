import { NextResponse } from "next/server";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { getChatStore } from "@/lib/chat/store";
import { createChatBodySchema } from "@/lib/chat/store/parse";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  const chats = await getChatStore().listChats(session.session.userId, session.session.workspaceId);
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

  const chat = await getChatStore().createChat(session.session.userId, {
    id: parsed.data.id,
    title: parsed.data.title,
    workspaceId: session.session.workspaceId,
    visibility,
  });

  return NextResponse.json({ chat }, { status: 201 });
}
