import { NextResponse } from "next/server";
import { getChatStore } from "@/lib/chat/store";
import { createChatBodySchema } from "@/lib/chat/store/parse";

export const runtime = "nodejs";

export function GET() {
  const chats = getChatStore().listChats();
  return NextResponse.json({ chats });
}

export async function POST(request: Request) {
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

  const chat = getChatStore().createChat({
    id: parsed.data.id,
    title: parsed.data.title,
  });

  return NextResponse.json({ chat }, { status: 201 });
}
