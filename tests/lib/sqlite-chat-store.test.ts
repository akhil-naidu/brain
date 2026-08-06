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
  it("creates, lists, updates, and deletes chats for a user in a workspace", () => {
    const store = openStore();
    const userId = "user-a";
    const workspaceId = "ws-a";
    const created = store.createChat(userId, { title: "Hello world", workspaceId });

    expect(created.title).toBe("Hello world");
    expect(created.userId).toBe(userId);
    expect(created.workspaceId).toBe(workspaceId);
    expect(store.listChats(userId, workspaceId)).toHaveLength(1);

    const updated = store.updateChat(userId, workspaceId, created.id, {
      eveSession: { streamIndex: 3, sessionId: "s1", continuationToken: "c1" },
      appendEvents: [fakeEvent("one"), fakeEvent("two")],
    });

    expect(updated?.eveSession?.streamIndex).toBe(3);
    expect(updated?.events).toHaveLength(2);

    const snapshotted = store.updateChat(userId, workspaceId, created.id, {
      events: [fakeEvent("only")],
      eveSession: { streamIndex: 4 },
    });
    expect(snapshotted?.events).toHaveLength(1);
    expect(snapshotted?.eveSession?.streamIndex).toBe(4);

    expect(store.deleteChat(userId, workspaceId, created.id)).toBe(true);
    expect(store.getChat(userId, workspaceId, created.id)).toBeNull();
    expect(store.listChats(userId, workspaceId)).toHaveLength(0);
  });

  it("orders chats by most recently updated", () => {
    const store = openStore();
    const userId = "user-a";
    const workspaceId = "ws-a";
    const first = store.createChat(userId, { title: "First", workspaceId });
    const second = store.createChat(userId, { title: "Second", workspaceId });

    store.updateChat(userId, workspaceId, first.id, { title: "First updated" });

    const listed = store.listChats(userId, workspaceId);
    expect(listed.map((chat) => chat.id)).toEqual([first.id, second.id]);
  });

  it("isolates chats between users and workspaces", () => {
    const store = openStore();
    const a = store.createChat("user-a", { title: "A only", workspaceId: "ws-1" });
    store.createChat("user-b", { title: "B only", workspaceId: "ws-1" });
    store.createChat("user-a", { title: "A ws2", workspaceId: "ws-2" });

    expect(store.listChats("user-a", "ws-1")).toHaveLength(1);
    expect(store.listChats("user-a", "ws-2")).toHaveLength(1);
    expect(store.listChats("user-b", "ws-1")).toHaveLength(1);
    expect(store.getChat("user-b", "ws-1", a.id)).toBeNull();
    expect(store.deleteChat("user-b", "ws-1", a.id)).toBe(false);
    expect(store.getChat("user-a", "ws-1", a.id)?.title).toBe("A only");
  });

  it("reassigns legacy ownership and assigns workspace", () => {
    const store = openStore();
    const legacy = store.createChat("__legacy__", { title: "Old", workspaceId: "__unset__" });
    expect(store.reassignOwner("__legacy__", "user-a")).toBe(1);
    expect(store.assignWorkspaceToUserChats("user-a", "ws-personal")).toBe(1);
    expect(store.getChat("user-a", "ws-personal", legacy.id)?.title).toBe("Old");
    expect(store.listChats("__legacy__", "__unset__")).toHaveLength(0);
  });
});
