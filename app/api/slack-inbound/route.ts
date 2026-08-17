import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteSlackInboundCredentials,
  readSlackInboundStoredAllowlist,
  slackInboundCredentialStatus,
  writeSlackInboundCredentials,
  resolveSlackInboundCredentials,
} from "@/agent/lib/slack-inbound-credentials";
import { resolveSlackInboundChannelAllowlist } from "@/lib/chat/slack-inbound/channel-allowlist";
import {
  listSlackConversationsForAllowlist,
  parseSlackInboundChannelLines,
  resolveSlackInboundChannelEntries,
  SlackChannelResolveError,
} from "@/lib/chat/slack-inbound/resolve-channel-names";
import { isOperatorUserId, requireOperatorSession } from "@/lib/auth/require-operator-session";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { resolvePublicOrigin } from "@/lib/http/public-origin";

export const runtime = "nodejs";

const putBodySchema = z
  .object({
    botToken: z.string().optional(),
    signingSecret: z.string().optional(),
    allowedChannelsText: z.string().optional(),
    limitMentions: z.boolean().optional(),
  })
  .strict();

async function allowlistPayload() {
  const allowlist = resolveSlackInboundChannelAllowlist({
    storedChannelIds: await readSlackInboundStoredAllowlist(),
    envChannelIds: process.env["SLACK_INBOUND_CHANNEL_IDS"],
  });
  return {
    allowedChannelIds: [...allowlist.channelIds],
    allowedChannelIdsSource: allowlist.source,
  };
}

export async function GET(request: Request) {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  const canManage = await isOperatorUserId(session.userId);
  if (!canManage) {
    return NextResponse.json({ canManage: false });
  }
  const status = await slackInboundCredentialStatus();
  const origin = resolvePublicOrigin(request);
  return NextResponse.json({
    canManage: true,
    hasBotToken: status.hasBotToken,
    hasSigningSecret: status.hasSigningSecret,
    source: status.source,
    eventUrl: `${origin}/eve/v1/slack`,
    ...(await allowlistPayload()),
  });
}

export async function PUT(request: Request) {
  const session = await requireOperatorSession();
  if (!session.ok) {
    return session.response;
  }
  const parsed = putBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bot token, signing secret, or allowed channels is required." },
      { status: 400 },
    );
  }
  const botToken = parsed.data.botToken?.trim();
  const signingSecret = parsed.data.signingSecret?.trim();
  const allowedChannelsText = parsed.data.allowedChannelsText;
  if (!botToken && !signingSecret && allowedChannelsText === undefined) {
    return NextResponse.json(
      { error: "Bot token, signing secret, or allowed channels is required." },
      { status: 400 },
    );
  }

  let allowedChannelIds: string[] | undefined;
  if (allowedChannelsText !== undefined) {
    try {
      const entries = parseSlackInboundChannelLines(allowedChannelsText);
      const needsNames = entries.some((entry) => entry.startsWith("#"));
      if (needsNames) {
        const credentials = await resolveSlackInboundCredentials();
        const resolveToken = botToken || credentials?.botToken;
        if (!resolveToken) {
          return NextResponse.json(
            {
              error:
                "A bot token is required to resolve #channel names. Paste C… / G… ids instead, or save a bot token first.",
            },
            { status: 400 },
          );
        }
        allowedChannelIds = await resolveSlackInboundChannelEntries(entries, () =>
          listSlackConversationsForAllowlist(resolveToken),
        );
      } else {
        allowedChannelIds = await resolveSlackInboundChannelEntries(entries, async () => []);
      }
      if (parsed.data.limitMentions === true && allowedChannelIds.length === 0) {
        return NextResponse.json(
          { error: "Select at least one channel or paste a C… / G… id." },
          { status: 400 },
        );
      }
    } catch (error) {
      const message =
        error instanceof SlackChannelResolveError
          ? error.message
          : "Could not save allowed Slack channels.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  try {
    await writeSlackInboundCredentials({
      botToken,
      signingSecret,
      allowedChannelIds,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bot token or signing secret is required.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const status = await slackInboundCredentialStatus();
  return NextResponse.json({
    ok: true,
    hasBotToken: status.hasBotToken,
    hasSigningSecret: status.hasSigningSecret,
    source: status.source,
    ...(await allowlistPayload()),
  });
}

export async function DELETE() {
  const session = await requireOperatorSession();
  if (!session.ok) {
    return session.response;
  }
  await deleteSlackInboundCredentials();
  return NextResponse.json({ ok: true, ...(await allowlistPayload()) });
}
