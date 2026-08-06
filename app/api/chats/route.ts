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
  const chats = getChatStore().listChats(session.session.userId, session.session.workspaceId);
  return NextResponse.json({ chats });
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

  const chat = getChatStore().createChat(session.session.userId, {
    id: parsed.data.id,
    title: parsed.data.title,
    workspaceId: session.session.workspaceId,
  });

  return NextResponse.json({ chat }, { status: 201 });
}
