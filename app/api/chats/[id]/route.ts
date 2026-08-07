import { NextResponse } from "next/server";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { isWorkspaceAdminRole } from "@/lib/auth/workspaces/types";
import { getChatStore, isChatConcurrencyError } from "@/lib/chat/store";
import { parseSessionState, parseStreamEvent, updateChatBodySchema } from "@/lib/chat/store/parse";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  const { id } = await context.params;
  const chat = await getChatStore().getChat(
    session.session.userId,
    session.session.workspaceId,
    id,
  );
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }
  return NextResponse.json({ chat });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
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

  if (parsed.data.visibility === "shared" && session.session.workspace.kind !== "team") {
    return NextResponse.json(
      { error: "Shared chats are only available in team workspaces." },
      { status: 400 },
    );
  }
  if (parsed.data.visibility === "personal") {
    return NextResponse.json({ error: "Unsharing a chat is not supported." }, { status: 400 });
  }

  try {
    const chat = await getChatStore().updateChat(
      session.session.userId,
      session.session.workspaceId,
      id,
      {
        title: parsed.data.title,
        visibility: parsed.data.visibility,
        eveSession:
          parsed.data.eveSession === undefined
            ? undefined
            : parsed.data.eveSession === null
              ? null
              : parseSessionState(parsed.data.eveSession),
        appendEvents: parsed.data.appendEvents?.map(parseStreamEvent),
        events: parsed.data.events?.map(parseStreamEvent),
        expectedRevision: parsed.data.expectedRevision,
        turnLock: parsed.data.turnLock,
      },
    );

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json({ chat });
  } catch (error) {
    if (isChatConcurrencyError(error)) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  const { id } = await context.params;
  const deleted = await getChatStore().deleteChat(
    session.session.userId,
    session.session.workspaceId,
    id,
    { moderateShared: isWorkspaceAdminRole(session.session.role) },
  );
  if (!deleted) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
