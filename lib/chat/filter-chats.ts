import type { ChatSummary } from "@/lib/chat/store/types";

/** Case-insensitive substring filter over chat titles. Empty query returns all. */
export function filterChatsByTitle(
  chats: readonly ChatSummary[],
  query: string,
): readonly ChatSummary[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) {
    return chats;
  }

  return chats.filter((chat) => chat.title.toLocaleLowerCase().includes(needle));
}
