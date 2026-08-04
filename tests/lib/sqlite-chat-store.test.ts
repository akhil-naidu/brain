import { afterEach, describe, expect, it } from "vitest";
import { createSqliteChatStore } from "@/lib/chat/store/sqlite-chat-store";
import { parseStreamEvent } from "@/lib/chat/store/parse";
import type { ChatStore } from "@/lib/chat/store/types";
import type { HandleMessageStreamEvent } from "eve/client";

const stores: ChatStore[] = [];

afterEach(() => {
  while (stores.length > 0) {
    stores.pop()?.close();
  }
});

function openStore() {
  const store = createSqliteChatStore(":memory:");
  stores.push(store);
  return store;
}

function fakeEvent(message: string): HandleMessageStreamEvent {
  return parseStreamEvent({
    type: "message.delta",
    data: { message },
  });
}

describe("sqlite chat store", () => {
  it("creates, lists, updates, and deletes chats", () => {
    const store = openStore();
    const created = store.createChat({ title: "Hello world" });

    expect(created.title).toBe("Hello world");
    expect(store.listChats()).toHaveLength(1);

    const updated = store.updateChat(created.id, {
      eveSession: { streamIndex: 3, sessionId: "s1", continuationToken: "c1" },
      appendEvents: [fakeEvent("one"), fakeEvent("two")],
    });

    expect(updated?.eveSession?.streamIndex).toBe(3);
    expect(updated?.events).toHaveLength(2);

    const snapshotted = store.updateChat(created.id, {
      events: [fakeEvent("only")],
      eveSession: { streamIndex: 4 },
    });
    expect(snapshotted?.events).toHaveLength(1);
    expect(snapshotted?.eveSession?.streamIndex).toBe(4);

    expect(store.deleteChat(created.id)).toBe(true);
    expect(store.getChat(created.id)).toBeNull();
    expect(store.listChats()).toHaveLength(0);
  });

  it("orders chats by most recently updated", () => {
    const store = openStore();
    const first = store.createChat({ title: "First" });
    const second = store.createChat({ title: "Second" });

    store.updateChat(first.id, { title: "First updated" });

    const listed = store.listChats();
    expect(listed.map((chat) => chat.id)).toEqual([first.id, second.id]);
  });
});
