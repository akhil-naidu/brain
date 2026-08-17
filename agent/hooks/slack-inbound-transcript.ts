import { defineHook } from "eve/hooks";
import { appendSlackThreadEvent } from "@/lib/chat/slack-inbound/thread-chat";

function attribute(
  auth: { readonly attributes?: Readonly<Record<string, string | readonly string[]>> } | null,
  key: string,
): string | null {
  const value = auth?.attributes?.[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
    return value[0].trim();
  }
  return null;
}

function slackThreadFromAuth(auth: {
  readonly current: {
    readonly attributes?: Readonly<Record<string, string | readonly string[]>>;
  } | null;
  readonly initiator: {
    readonly attributes?: Readonly<Record<string, string | readonly string[]>>;
  } | null;
}): {
  readonly slackTeamId: string;
  readonly slackChannelId: string;
  readonly slackThreadTs: string;
} | null {
  const source = auth.initiator ?? auth.current;
  const slackTeamId = attribute(source, "slack_team_id");
  const slackChannelId = attribute(source, "slack_channel_id");
  const slackThreadTs = attribute(source, "slack_thread_ts");
  if (!slackTeamId || !slackChannelId || !slackThreadTs) {
    return null;
  }
  return { slackTeamId, slackChannelId, slackThreadTs };
}

export default defineHook({
  events: {
    async "*"(event, ctx) {
      if (ctx.channel.kind !== "slack") {
        return;
      }
      const thread = slackThreadFromAuth(ctx.session.auth);
      if (!thread) {
        return;
      }
      try {
        await appendSlackThreadEvent({
          ...thread,
          event,
          sessionId: ctx.session.id,
          continuationToken: ctx.channel.continuationToken,
        });
      } catch {
        // Transcript persistence must not fail the Slack turn.
      }
    },
  },
});
