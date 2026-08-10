import type { ChatSummary } from "@/lib/chat/store/types";

/** Pinned chats first, then most recently updated. */
export function compareChatSummaries(a: ChatSummary, b: ChatSummary): number {
  const aPinned = a.pinnedAt !== null;
  const bPinned = b.pinnedAt !== null;
  if (aPinned !== bPinned) {
    return aPinned ? -1 : 1;
  }
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function sortChatSummaries(chats: readonly ChatSummary[]): ChatSummary[] {
  return [...chats].toSorted(compareChatSummaries);
}
