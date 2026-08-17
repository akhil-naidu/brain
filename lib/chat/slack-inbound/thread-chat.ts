import type { HandleMessageStreamEvent } from "eve/client";
import { DEFAULT_CHAT_TITLE, createFallbackTitle } from "@/lib/chat/title";
import { getChatStore } from "@/lib/chat/store";
import {
  getSlackInboundStore,
  type SlackIdentity,
  type SlackThreadChat,
} from "@/lib/chat/slack-inbound/store";

const SLACK_DM_TITLE = "Slack DM";

export async function ensureSlackThreadChat(input: {
  readonly identity: SlackIdentity;
  readonly slackChannelId: string;
  readonly slackThreadTs: string;
  readonly titleSource: string;
  readonly remap: boolean;
  readonly isDirectMessage: boolean;
}): Promise<SlackThreadChat> {
  const store = getSlackInboundStore();
  const chats = getChatStore();
  const existing = await store.getThreadChat(
    input.identity.slackTeamId,
    input.slackChannelId,
    input.slackThreadTs,
  );
  if (existing && !input.remap) {
    return existing;
  }

  const title = input.isDirectMessage
    ? createFallbackTitle(input.titleSource) || SLACK_DM_TITLE
    : createFallbackTitle(input.titleSource) || "Slack thread";
  const chat = await chats.createChat(input.identity.userId, {
    title: title === DEFAULT_CHAT_TITLE && input.isDirectMessage ? SLACK_DM_TITLE : title,
    workspaceId: input.identity.workspaceId,
    visibility: "personal",
  });
  return store.upsertThreadChat({
    slackTeamId: input.identity.slackTeamId,
    slackChannelId: input.slackChannelId.trim(),
    slackThreadTs: input.slackThreadTs.trim(),
    chatId: chat.id,
    userId: input.identity.userId,
    workspaceId: input.identity.workspaceId,
  });
}

export async function appendSlackThreadEvent(input: {
  readonly slackTeamId: string;
  readonly slackChannelId: string;
  readonly slackThreadTs: string;
  readonly event: HandleMessageStreamEvent;
  readonly sessionId: string;
  readonly continuationToken?: string;
}): Promise<void> {
  const mapping = await getSlackInboundStore().getThreadChat(
    input.slackTeamId,
    input.slackChannelId,
    input.slackThreadTs,
  );
  if (!mapping) {
    return;
  }
  await getChatStore().updateChat(mapping.userId, mapping.workspaceId, mapping.chatId, {
    eveSession: {
      sessionId: input.sessionId,
      ...(input.continuationToken ? { continuationToken: input.continuationToken } : {}),
      streamIndex: 0,
    },
    appendEvents: [input.event],
  });
}
