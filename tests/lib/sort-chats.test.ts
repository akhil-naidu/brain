import { describe, expect, it } from "vitest";
import { sortChatSummaries } from "@/lib/chat/sort-chats";
import type { ChatSummary } from "@/lib/chat/store/types";

function summary(
  partial: Partial<ChatSummary> & Pick<ChatSummary, "id" | "updatedAt">,
): ChatSummary {
  return {
    title: partial.id,
    createdAt: "2026-08-04T00:00:00.000Z",
    visibility: "personal",
    userId: "user-a",
    revision: 0,
    pinnedAt: null,
    archivedAt: null,
    ...partial,
  };
}

describe("sortChatSummaries", () => {
  it("keeps pinned chats above unpinned ones", () => {
    const chats = [
      summary({ id: "recent", updatedAt: "2026-08-10T12:00:00.000Z" }),
      summary({
        id: "pinned",
        updatedAt: "2026-08-01T00:00:00.000Z",
        pinnedAt: "2026-08-09T00:00:00.000Z",
      }),
    ];

    expect(sortChatSummaries(chats).map((chat) => chat.id)).toEqual(["pinned", "recent"]);
  });
});
