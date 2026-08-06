import { Client } from "eve/client";
import { resolveInternalOperatorToken } from "@/lib/auth/operator";
import { BRAIN_RUN_AS_USER_HEADER } from "@/lib/auth/run-as";
import { createConnectionClientContext } from "@/lib/chat/connection-context";
import { resolveEveHttpHost } from "@/lib/chat/eve-http-host";
import { postMorningBriefToSlack } from "@/lib/chat/slack-brief-delivery";
import { getChatStore } from "@/lib/chat/store";
import type { ChatRecord } from "@/lib/chat/store/types";

export type ScheduledSlackResult =
  | { readonly attempted: false }
  | { readonly attempted: true; readonly ok: true; readonly channelId: string }
  | { readonly attempted: true; readonly ok: false; readonly error: string };

const SCHEDULED_CONNECTIONS = {
  asana: true,
  clickup: true,
  dflow: true,
  github: true,
  gmail: true,
  slack: true,
} as const;

async function deliverToSlackIfConfigured(input: {
  readonly userId: string;
  readonly slackDeliveryEnabled: boolean;
  readonly slackChannel: string | null;
  readonly title: string;
  readonly text: string;
}): Promise<ScheduledSlackResult> {
  if (!input.slackDeliveryEnabled) {
    return { attempted: false };
  }
  const channel = input.slackChannel?.trim();
  if (!channel) {
    return {
      attempted: true,
      ok: false,
      error: "Slack delivery is on, but no channel is set.",
    };
  }

  const result = await postMorningBriefToSlack({
    userId: input.userId,
    channel,
    title: input.title,
    briefText: input.text,
  });

  if (result.ok) {
    return { attempted: true, ok: true, channelId: result.channelId };
  }
  return { attempted: true, ok: false, error: result.error };
}

/**
 * Creates a chat, runs one eve turn with the given prompt, optionally posts to Slack.
 */
export async function runScheduledPromptTurn(input: {
  readonly userId: string;
  readonly title: string;
  readonly prompt: string;
  readonly slackDeliveryEnabled?: boolean;
  readonly slackChannel?: string | null;
}): Promise<{
  readonly chat: ChatRecord;
  readonly message: string;
  readonly slack: ScheduledSlackResult;
}> {
  const userId = input.userId.trim();
  if (!userId) {
    throw new Error("Scheduled runs require an owning user id.");
  }
  const store = getChatStore();
  const chat = store.createChat(userId, { title: input.title });

  const internalToken = resolveInternalOperatorToken();
  if (!internalToken) {
    throw new Error("Set BRAIN_INTERNAL_TOKEN so scheduled runs can authenticate to eve.");
  }

  const client = new Client({
    host: resolveEveHttpHost(),
    preserveCompletedSessions: true,
    auth: { bearer: internalToken },
    headers: {
      [BRAIN_RUN_AS_USER_HEADER]: userId,
    },
  });
  const session = client.session();
  const response = await session.send({
    message: input.prompt,
    clientContext: [createConnectionClientContext(SCHEDULED_CONNECTIONS)],
  });

  store.updateChat(userId, chat.id, {
    eveSession: {
      sessionId: response.sessionId,
      continuationToken: response.continuationToken,
      streamIndex: 0,
    },
  });

  const result = await response.result();
  const updated = store.updateChat(userId, chat.id, {
    eveSession: session.state,
    events: result.events,
  });

  if (!updated) {
    throw new Error("Failed to persist scheduled chat.");
  }

  if (result.status === "failed") {
    throw new Error("Scheduled session failed.");
  }

  const message = result.message ?? "";
  const slack = await deliverToSlackIfConfigured({
    userId,
    slackDeliveryEnabled: input.slackDeliveryEnabled === true,
    slackChannel: input.slackChannel ?? null,
    title: input.title,
    text: message,
  });

  return { chat: updated, message, slack };
}
