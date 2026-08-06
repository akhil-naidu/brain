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

  it("shares workspace chats with other members while keeping personal private", () => {
    const store = openStore();
    const personal = store.createChat("user-a", {
      title: "Private",
      workspaceId: "ws-1",
      visibility: "personal",
    });
    const shared = store.createChat("user-a", {
      title: "Team thread",
      workspaceId: "ws-1",
      visibility: "shared",
    });

    expect(store.listChats("user-b", "ws-1").map((chat) => chat.id)).toEqual([shared.id]);
    expect(store.getChat("user-b", "ws-1", personal.id)).toBeNull();
    expect(store.getChat("user-b", "ws-1", shared.id)?.title).toBe("Team thread");

    const updated = store.updateChat("user-b", "ws-1", shared.id, {
      title: "Team thread updated",
    });
    expect(updated?.title).toBe("Team thread updated");

    expect(store.deleteChat("user-b", "ws-1", shared.id)).toBe(false);
    expect(store.deleteChat("user-b", "ws-1", shared.id, { moderateShared: true })).toBe(true);
    expect(store.getChat("user-a", "ws-1", shared.id)).toBeNull();
    expect(store.getChat("user-a", "ws-1", personal.id)?.visibility).toBe("personal");
  });

  it("lets the owner promote a personal chat to shared", () => {
    const store = openStore();
    const personal = store.createChat("user-a", {
      title: "Later share",
      workspaceId: "ws-1",
      visibility: "personal",
    });

    expect(store.updateChat("user-b", "ws-1", personal.id, { visibility: "shared" })).toBeNull();
    expect(store.getChat("user-b", "ws-1", personal.id)).toBeNull();

    const shared = store.updateChat("user-a", "ws-1", personal.id, { visibility: "shared" });
    expect(shared?.visibility).toBe("shared");
    expect(store.getChat("user-b", "ws-1", personal.id)?.title).toBe("Later share");
    expect(store.updateChat("user-a", "ws-1", personal.id, { visibility: "personal" })).toBeNull();
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
