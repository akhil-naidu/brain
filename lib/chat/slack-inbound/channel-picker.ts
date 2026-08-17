import { parseSlackInboundChannelLines } from "@/lib/chat/slack-inbound/resolve-channel-names";

export type SlackInboundListedChannel = {
  readonly id: string;
  readonly name: string;
  readonly selected: boolean;
};

function idKey(id: string): string {
  return id.trim().toUpperCase();
}

export function markSlackInboundChannelsSelected(
  conversations: readonly { readonly id: string; readonly name: string }[],
  effectiveIds: readonly string[],
): SlackInboundListedChannel[] {
  const selected = new Set(effectiveIds.map(idKey).filter((id) => id.length > 0));
  return conversations.map((conversation) => ({
    id: conversation.id,
    name: conversation.name,
    selected: selected.has(idKey(conversation.id)),
  }));
}

export function extraSlackInboundChannelIds(
  effectiveIds: readonly string[],
  listedIds: readonly string[],
): string[] {
  const listed = new Set(listedIds.map(idKey).filter((id) => id.length > 0));
  return effectiveIds.filter((id) => {
    const key = idKey(id);
    return key.length > 0 && !listed.has(key);
  });
}

export function slackInboundAllowlistSaveText(input: {
  readonly limitMentions: boolean;
  readonly selectedIds: readonly string[];
  readonly extraText: string;
}):
  | { readonly ok: true; readonly allowedChannelsText: string }
  | { readonly ok: false; readonly error: string } {
  if (!input.limitMentions) {
    return { ok: true, allowedChannelsText: "" };
  }
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const id of [...input.selectedIds, ...parseSlackInboundChannelLines(input.extraText)]) {
    const key = idKey(id);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    lines.push(id.trim());
  }
  if (lines.length === 0) {
    return {
      ok: false,
      error: "Select at least one channel or paste a C… / G… id.",
    };
  }
  return { ok: true, allowedChannelsText: lines.join("\n") };
}

export async function loadSlackInboundChannelPicker(input: {
  readonly botToken: string | null;
  readonly effectiveIds: readonly string[];
  readonly listConversations: (
    token: string,
  ) => Promise<readonly { readonly id: string; readonly name: string }[]>;
}): Promise<
  | { readonly ok: true; readonly channels: SlackInboundListedChannel[] }
  | { readonly ok: false; readonly error: string }
> {
  const botToken = input.botToken?.trim() || null;
  if (!botToken) {
    return { ok: false, error: "Save a bot token to load Slack channels." };
  }
  const conversations = await input.listConversations(botToken);
  return {
    ok: true,
    channels: markSlackInboundChannelsSelected(conversations, input.effectiveIds),
  };
}
