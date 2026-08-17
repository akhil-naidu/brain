import { callSlackApi } from "eve/channels/slack";
import { asStringKeyedRecord } from "@/lib/chat/slack-inbound/json-object";
import { parseSlackInboundChannelLines } from "@/lib/chat/slack-inbound/parse-channel-lines";

export { parseSlackInboundChannelLines };

export class SlackChannelResolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlackChannelResolveError";
  }
}

const CHANNEL_ID = /^[CG][A-Z0-9]+$/i;

export async function resolveSlackInboundChannelEntries(
  entries: readonly string[],
  listConversations: () => Promise<readonly { readonly id: string; readonly name: string }[]>,
): Promise<string[]> {
  const needsNames = entries.some((entry) => entry.startsWith("#"));
  const conversations = needsNames ? await listConversations() : [];
  const byName = new Map(
    conversations.map((conversation) => [conversation.name.trim().toLowerCase(), conversation.id]),
  );
  const resolved: string[] = [];
  for (const entry of entries) {
    if (CHANNEL_ID.test(entry)) {
      resolved.push(entry.toUpperCase());
      continue;
    }
    if (entry.startsWith("#")) {
      const name = entry.slice(1).trim().toLowerCase();
      const id = byName.get(name);
      if (!id) {
        throw new SlackChannelResolveError(
          `Could not resolve ${entry}. Invite the bot to that channel or paste the C… / G… id.`,
        );
      }
      resolved.push(id.trim().toUpperCase());
      continue;
    }
    throw new SlackChannelResolveError(
      `“${entry}” is not a Slack channel id or #name. Use C… / G… ids or #channel-name.`,
    );
  }
  return resolved;
}

function conversationsFromSlack(value: unknown): { readonly id: string; readonly name: string }[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const conversations: { readonly id: string; readonly name: string }[] = [];
  for (const item of value) {
    const record = asStringKeyedRecord(item);
    const id = record?.["id"];
    const name = record?.["name"];
    if (typeof id === "string" && id.trim() && typeof name === "string" && name.trim()) {
      conversations.push({ id: id.trim(), name: name.trim() });
    }
  }
  return conversations;
}

export async function listSlackConversationsForAllowlist(
  botToken: string,
): Promise<readonly { readonly id: string; readonly name: string }[]> {
  return listSlackConversationPage(botToken, "", 20);
}

async function listSlackConversationPage(
  botToken: string,
  cursor: string,
  remainingPages: number,
): Promise<{ readonly id: string; readonly name: string }[]> {
  if (remainingPages <= 0) {
    return [];
  }
  const response = await callSlackApi({
    botToken,
    operation: "conversations.list",
    body: {
      types: "public_channel,private_channel",
      exclude_archived: true,
      limit: 200,
      ...(cursor ? { cursor } : {}),
    },
  });
  if (!response.ok) {
    throw new SlackChannelResolveError(
      "Could not list Slack channels. Check the bot token and try again.",
    );
  }
  const page = conversationsFromSlack(response["channels"]);
  const metadata = asStringKeyedRecord(response["response_metadata"]);
  const next = metadata?.["next_cursor"];
  const nextCursor = typeof next === "string" ? next.trim() : "";
  if (!nextCursor) {
    return page;
  }
  const rest = await listSlackConversationPage(botToken, nextCursor, remainingPages - 1);
  return [...page, ...rest];
}
