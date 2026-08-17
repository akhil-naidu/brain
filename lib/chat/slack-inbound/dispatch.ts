import type { SlackInboundResult } from "eve/channels/slack";
import { sessionAuthContext } from "@/lib/auth/principal";
import { readConfiguredPublicOrigin } from "@/lib/http/public-origin";
import { DEFAULT_BRAIN_CHAT_MODEL_ID } from "@/agent/lib/models";
import { createTurnClientContext } from "@/lib/chat/turn-client-context";
import { getPool } from "@/lib/db/pool";
import { callSlackApi } from "eve/channels/slack";
import { resolveSlackInboundCredentials } from "@/agent/lib/slack-inbound-credentials";
import { asStringKeyedRecord } from "@/lib/chat/slack-inbound/json-object";
import { slackInboundAuthAttributes } from "@/lib/chat/slack-inbound/principal";
import { resolveSlackInboundUser, type SlackIdentity } from "@/lib/chat/slack-inbound/store";
import { ensureSlackThreadChat } from "@/lib/chat/slack-inbound/thread-chat";

const SLACK_INBOUND_CONNECTIONS = {
  asana: true,
  atlassian: true,
  clickup: true,
  dflow: true,
  github: true,
  gmail: true,
  linear: true,
  mongodb: true,
  notion: true,
  sentry: true,
  slack: true,
  snowflake: true,
  toolbox: true,
  zernio: true,
};

export type SlackInboundKind = "dm" | "mention" | "message";

export type SlackInboundDispatchMessage = {
  readonly text: string;
  readonly ts: string;
  readonly threadTs: string;
  readonly channelId: string;
  readonly teamId?: string;
  readonly author?: {
    readonly userId: string;
    readonly isBot: boolean;
  };
  readonly raw?: Record<string, unknown>;
};

export type SlackInboundDispatchContext = {
  readonly kind: SlackInboundKind;
  isBotMentioned(): boolean;
  isSubscribed(): Promise<boolean>;
  reset(options?: { readonly reason?: string }): Promise<unknown>;
  startTyping(status?: string): Promise<unknown>;
  postPrivate(userId: string, text: string): Promise<unknown>;
  postPublic(text: string): Promise<unknown>;
};

function clientContextLine(workspaceId: string): string {
  const context = createTurnClientContext({
    enabledConnections: SLACK_INBOUND_CONNECTIONS,
    modelId: DEFAULT_BRAIN_CHAT_MODEL_ID,
    mode: "agent",
    workspaceId,
  });
  return `Client context:\n${JSON.stringify(context)}`;
}

function connectSlackUrl(): string {
  const origin = readConfiguredPublicOrigin() ?? "https://localhost";
  return `${origin.replace(/\/$/, "")}/tools?focus=slack`;
}

function unmappedReply(): string {
  return `I can only chat with people who have a Brain account linked to this Slack user. Sign in to Brain and Connect Slack: ${connectSlackUrl()}`;
}

async function fetchSlackProfileEmail(slackUserId: string): Promise<string | null> {
  const credentials = await resolveSlackInboundCredentials();
  if (!credentials) {
    return null;
  }
  try {
    const response = await callSlackApi({
      botToken: credentials.botToken,
      operation: "users.info",
      body: { user: slackUserId },
    });
    if (!response.ok) {
      return null;
    }
    const user = asStringKeyedRecord(response["user"]);
    if (!user) {
      return null;
    }
    const profile = asStringKeyedRecord(user["profile"]);
    if (!profile) {
      return null;
    }
    const email = profile["email"];
    return typeof email === "string" && email.trim() ? email.trim() : null;
  } catch {
    return null;
  }
}

async function mapInboundUser(input: {
  readonly slackTeamId: string;
  readonly slackUserId: string;
}): Promise<SlackIdentity | null> {
  const pool = getPool();
  const byId = await resolveSlackInboundUser(pool, {
    slackTeamId: input.slackTeamId,
    slackUserId: input.slackUserId,
  });
  if (byId) {
    return byId;
  }
  const email = await fetchSlackProfileEmail(input.slackUserId);
  if (!email) {
    return null;
  }
  return resolveSlackInboundUser(pool, {
    slackTeamId: input.slackTeamId,
    slackUserId: input.slackUserId,
    email,
  });
}

function isDirectMessage(message: SlackInboundDispatchMessage, kind: SlackInboundKind): boolean {
  if (kind === "dm") {
    return true;
  }
  return message.raw?.["channel_type"] === "im";
}

export async function handleSlackInboundMessage(
  ctx: SlackInboundDispatchContext,
  message: SlackInboundDispatchMessage,
): Promise<SlackInboundResult> {
  if (!message.author || message.author.isBot) {
    return null;
  }
  if (ctx.kind === "message") {
    const followUp = ctx.isBotMentioned() || (await ctx.isSubscribed());
    if (!followUp) {
      return null;
    }
  }

  const slackTeamId = message.teamId?.trim();
  if (!slackTeamId) {
    return null;
  }

  const identity = await mapInboundUser({
    slackTeamId,
    slackUserId: message.author.userId,
  });
  if (!identity) {
    await ctx.postPrivate(message.author.userId, unmappedReply());
    return null;
  }

  const threadTs = message.threadTs || message.ts;
  const isDm = isDirectMessage(message, ctx.kind);
  const isReset = message.text.trim() === "/new";

  if (isReset) {
    await ctx.reset({ reason: "Slack user requested /new" });
    await ensureSlackThreadChat({
      identity,
      slackChannelId: message.channelId,
      slackThreadTs: threadTs,
      titleSource: "Slack DM",
      remap: true,
      isDirectMessage: isDm,
    });
    await ctx.postPublic("Started a fresh conversation.");
    return null;
  }

  await ensureSlackThreadChat({
    identity,
    slackChannelId: message.channelId,
    slackThreadTs: threadTs,
    titleSource: message.text,
    remap: false,
    isDirectMessage: isDm,
  });

  try {
    await ctx.startTyping("Thinking...");
  } catch {
    // Typing is best-effort; dispatch still proceeds.
  }

  return {
    auth: sessionAuthContext(
      identity.userId,
      identity.workspaceId,
      slackInboundAuthAttributes({
        slackUserId: message.author.userId,
        slackTeamId,
        slackChannelId: message.channelId,
        slackThreadTs: threadTs,
      }),
    ),
    context: [clientContextLine(identity.workspaceId)],
  };
}
