export type SlackInboundChannelAllowlist = {
  readonly channelIds: readonly string[];
  readonly source: "stored" | "env" | null;
};

export function parseSlackInboundChannelIdList(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function resolveSlackInboundChannelAllowlist(input: {
  readonly storedChannelIds: readonly string[] | undefined;
  readonly envChannelIds: string | undefined;
}): SlackInboundChannelAllowlist {
  if (input.storedChannelIds) {
    return {
      channelIds: [...input.storedChannelIds],
      source: "stored",
    };
  }
  const fromEnv = parseSlackInboundChannelIdList(input.envChannelIds);
  if (fromEnv.length > 0) {
    return { channelIds: fromEnv, source: "env" };
  }
  return { channelIds: [], source: null };
}

export function isSlackInboundChannelAllowed(input: {
  readonly isDirectMessage: boolean;
  readonly channelId: string;
  readonly allowedChannelIds: readonly string[];
}): boolean {
  if (input.isDirectMessage) {
    return true;
  }
  if (input.allowedChannelIds.length === 0) {
    return true;
  }
  const channelId = input.channelId.trim().toUpperCase();
  return input.allowedChannelIds.some((id) => id.trim().toUpperCase() === channelId);
}
