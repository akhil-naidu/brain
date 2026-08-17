import { NextResponse } from "next/server";
import {
  readSlackInboundStoredAllowlist,
  resolveSlackInboundCredentials,
} from "@/agent/lib/slack-inbound-credentials";
import { resolveSlackInboundChannelAllowlist } from "@/lib/chat/slack-inbound/channel-allowlist";
import { loadSlackInboundChannelPicker } from "@/lib/chat/slack-inbound/channel-picker";
import {
  listSlackConversationsForAllowlist,
  SlackChannelResolveError,
} from "@/lib/chat/slack-inbound/resolve-channel-names";
import { requireOperatorSession } from "@/lib/auth/require-operator-session";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireOperatorSession();
  if (!session.ok) {
    return session.response;
  }
  const credentials = await resolveSlackInboundCredentials();
  const allowlist = resolveSlackInboundChannelAllowlist({
    storedChannelIds: await readSlackInboundStoredAllowlist(),
    envChannelIds: process.env["SLACK_INBOUND_CHANNEL_IDS"],
  });
  try {
    const loaded = await loadSlackInboundChannelPicker({
      botToken: credentials?.botToken ?? null,
      effectiveIds: allowlist.channelIds,
      listConversations: (token) => listSlackConversationsForAllowlist(token),
    });
    if (!loaded.ok) {
      return NextResponse.json({ error: loaded.error }, { status: 400 });
    }
    return NextResponse.json({ channels: loaded.channels });
  } catch (error) {
    const message =
      error instanceof SlackChannelResolveError
        ? error.message
        : "Could not list Slack channels. Check the bot token and try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
