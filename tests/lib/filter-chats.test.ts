import { describe, expect, it } from "vitest";
import { filterChatsByTitle } from "@/lib/chat/filter-chats";
import type { ChatSummary } from "@/lib/chat/store/types";

const chats: readonly ChatSummary[] = [
  {
    id: "1",
    title: "ClickUp standup notes",
    createdAt: "2026-08-04T00:00:00.000Z",
    updatedAt: "2026-08-04T00:00:00.000Z",
    visibility: "personal",
    userId: "user-a",
  },
  {
    id: "2",
    title: "Gmail triage",
    createdAt: "2026-08-04T00:00:00.000Z",
    updatedAt: "2026-08-04T00:00:00.000Z",
    visibility: "personal",
    userId: "user-a",
  },
];

describe("filterChatsByTitle", () => {
  it("returns all chats for an empty query", () => {
    expect(filterChatsByTitle(chats, "")).toEqual(chats);
    expect(filterChatsByTitle(chats, "   ")).toEqual(chats);
  });

  it("matches titles case-insensitively", () => {
    expect(filterChatsByTitle(chats, "gmail").map((chat) => chat.id)).toEqual(["2"]);
    expect(filterChatsByTitle(chats, "CLICKUP").map((chat) => chat.id)).toEqual(["1"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterChatsByTitle(chats, "asana")).toEqual([]);
  });
});
