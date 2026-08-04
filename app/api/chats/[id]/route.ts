import { NextResponse } from "next/server";
import { getChatStore } from "@/lib/chat/store";
import { parseSessionState, parseStreamEvent, updateChatBodySchema } from "@/lib/chat/store/parse";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const chat = getChatStore().getChat(id);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }
  return NextResponse.json({ chat });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateChatBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const chat = getChatStore().updateChat(id, {
    title: parsed.data.title,
    eveSession:
      parsed.data.eveSession === undefined
        ? undefined
        : parsed.data.eveSession === null
          ? null
          : parseSessionState(parsed.data.eveSession),
    appendEvents: parsed.data.appendEvents?.map(parseStreamEvent),
    events: parsed.data.events?.map(parseStreamEvent),
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  return NextResponse.json({ chat });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const deleted = getChatStore().deleteChat(id);
  if (!deleted) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
