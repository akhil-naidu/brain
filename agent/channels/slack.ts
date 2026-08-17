import { slackChannel } from "eve/channels/slack";
import type {
  SlackInboundMessageContext,
  SlackInboundResult,
  SlackMessage,
} from "eve/channels/slack";
import { backfillSlackIdentitiesOnce } from "@/lib/chat/slack-inbound/record-identity";
import {
  handleSlackInboundMessage,
  type SlackInboundKind,
} from "@/lib/chat/slack-inbound/dispatch";
import { verifyBrainSlackWebhook } from "@/lib/chat/slack-inbound/verify";
import { resolveSlackInboundCredentials } from "@/agent/lib/slack-inbound-credentials";

void backfillSlackIdentitiesOnce().catch(() => undefined);

async function dispatch(
  kind: SlackInboundKind,
  ctx: SlackInboundMessageContext,
  message: SlackMessage,
): Promise<SlackInboundResult> {
  return handleSlackInboundMessage(
    {
      kind,
      isBotMentioned: () => ctx.isBotMentioned(),
      isSubscribed: () => ctx.isSubscribed(),
      reset: (options) => ctx.reset(options),
      startTyping: (status) => ctx.thread.startTyping(status),
      postPrivate: async (userId, text) => {
        try {
          await ctx.thread.postEphemeral(userId, text);
        } catch {
          await ctx.thread.postDirectMessage(userId, text);
        }
      },
      postPublic: (text) => ctx.thread.post(text),
    },
    {
      text: message.text,
      ts: message.ts,
      threadTs: message.threadTs,
      channelId: message.channelId,
      teamId: message.teamId ?? ctx.slack.teamId ?? undefined,
      author: message.author
        ? { userId: message.author.userId, isBot: message.author.isBot }
        : undefined,
      raw: message.raw,
    },
  );
}

export default slackChannel({
  credentials: {
    botToken: async () => {
      const credentials = await resolveSlackInboundCredentials();
      if (!credentials) {
        throw new Error("Slack inbound is not configured.");
      }
      return credentials.botToken;
    },
    webhookVerifier: verifyBrainSlackWebhook,
  },
  threadContext: { since: "last-agent-reply" },
  onDirectMessage: (ctx, message) => dispatch("dm", ctx, message),
  onAppMention: (ctx, message) => dispatch("mention", ctx, message),
  onMessage: (ctx, message) => dispatch("message", ctx, message),
});
