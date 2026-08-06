import { NextResponse } from "next/server";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { getChatStore } from "@/lib/chat/store";
import { createChatBodySchema } from "@/lib/chat/store/parse";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  const chats = getChatStore().listChats(session.userId);
  return NextResponse.json({ chats });
}

export async function POST(request: Request) {
  const session = await requireSessionUserId();
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

  const chat = getChatStore().createChat(session.userId, {
    id: parsed.data.id,
    title: parsed.data.title,
  });

  return NextResponse.json({ chat }, { status: 201 });
}
