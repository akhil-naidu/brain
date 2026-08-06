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
  it("creates, lists, updates, and deletes chats for a user", () => {
    const store = openStore();
    const userId = "user-a";
    const created = store.createChat(userId, { title: "Hello world" });

    expect(created.title).toBe("Hello world");
    expect(created.userId).toBe(userId);
    expect(store.listChats(userId)).toHaveLength(1);

    const updated = store.updateChat(userId, created.id, {
      eveSession: { streamIndex: 3, sessionId: "s1", continuationToken: "c1" },
      appendEvents: [fakeEvent("one"), fakeEvent("two")],
    });

    expect(updated?.eveSession?.streamIndex).toBe(3);
    expect(updated?.events).toHaveLength(2);

    const snapshotted = store.updateChat(userId, created.id, {
      events: [fakeEvent("only")],
      eveSession: { streamIndex: 4 },
    });
    expect(snapshotted?.events).toHaveLength(1);
    expect(snapshotted?.eveSession?.streamIndex).toBe(4);

    expect(store.deleteChat(userId, created.id)).toBe(true);
    expect(store.getChat(userId, created.id)).toBeNull();
    expect(store.listChats(userId)).toHaveLength(0);
  });

  it("orders chats by most recently updated", () => {
    const store = openStore();
    const userId = "user-a";
    const first = store.createChat(userId, { title: "First" });
    const second = store.createChat(userId, { title: "Second" });

    store.updateChat(userId, first.id, { title: "First updated" });

    const listed = store.listChats(userId);
    expect(listed.map((chat) => chat.id)).toEqual([first.id, second.id]);
  });

  it("isolates chats between users", () => {
    const store = openStore();
    const a = store.createChat("user-a", { title: "A only" });
    store.createChat("user-b", { title: "B only" });

    expect(store.listChats("user-a")).toHaveLength(1);
    expect(store.listChats("user-b")).toHaveLength(1);
    expect(store.getChat("user-b", a.id)).toBeNull();
    expect(store.deleteChat("user-b", a.id)).toBe(false);
    expect(store.getChat("user-a", a.id)?.title).toBe("A only");
  });

  it("reassigns legacy ownership", () => {
    const store = openStore();
    const legacy = store.createChat("__legacy__", { title: "Old" });
    expect(store.reassignOwner("__legacy__", "user-a")).toBe(1);
    expect(store.getChat("user-a", legacy.id)?.title).toBe("Old");
    expect(store.listChats("__legacy__")).toHaveLength(0);
  });
});
