import { NextResponse } from "next/server";
import { z } from "zod";
import { callSlackApi } from "eve/channels/slack";
import { resolveSlackInboundCredentials } from "@/agent/lib/slack-inbound-credentials";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { getSlackInboundStore } from "@/lib/chat/slack-inbound/store";
import { postSlackThreadMirror } from "@/lib/chat/slack-inbound/slack-mirror";
import { getChatStore } from "@/lib/chat/store";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ id: string }>;
};

const bodySchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    text: z.string(),
  })
  .strict();

export async function POST(request: Request, context: RouteContext) {
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

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "role and text are required." }, { status: 400 });
  }

  const mapping = await getSlackInboundStore().getThreadChatByChatId(chat.id);
  const credentials = await resolveSlackInboundCredentials();
  const botToken = credentials?.botToken ?? null;
  const result = await postSlackThreadMirror({
    botToken,
    mapping:
      mapping && mapping.userId === session.session.userId
        ? { channelId: mapping.slackChannelId, threadTs: mapping.slackThreadTs }
        : null,
    role: parsed.data.role,
    text: parsed.data.text,
    post: async (body) => {
      if (!botToken) {
        return { ok: false, error: "Slack inbound is not configured." };
      }
      const response = await callSlackApi({
        botToken,
        operation: "chat.postMessage",
        body: {
          channel: body.channel,
          thread_ts: body.thread_ts,
          text: body.text,
          unfurl_links: false,
        },
      });
      const error = response["error"];
      return {
        ok: response.ok,
        error: typeof error === "string" ? error : undefined,
      };
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, posted: result.posted });
}
