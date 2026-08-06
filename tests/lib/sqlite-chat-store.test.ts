import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { createSqliteChatStore } from "@/lib/chat/store/sqlite-chat-store";
import { parseStreamEvent } from "@/lib/chat/store/parse";
import type { ChatStore } from "@/lib/chat/store/types";
import type { HandleMessageStreamEvent } from "eve/client";

const stores: ChatStore[] = [];
const temporaryDirectories: string[] = [];

afterEach(() => {
  while (stores.length > 0) {
    stores.pop()?.close();
  }
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory) {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

function openStore(dbPath = ":memory:") {
  const store = createSqliteChatStore(dbPath);
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

  it("migrates legacy chat tables that required user_id", () => {
    const directory = mkdtempSync(join(tmpdir(), "brain-chat-migrate-"));
    temporaryDirectories.push(directory);
    const dbPath = join(directory, "chats.sqlite");

    const seed = new DatabaseSync(dbPath);
    seed.exec(`
      CREATE TABLE chat (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        title TEXT NOT NULL,
        eve_session TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE chat_event (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL REFERENCES chat(id) ON DELETE CASCADE,
        event_index INTEGER NOT NULL,
        event TEXT NOT NULL,
        UNIQUE(chat_id, event_index)
      );
      INSERT INTO chat (id, user_id, workspace_id, title, eve_session, created_at, updated_at)
        VALUES ('c1', 'u1', 'w1', 'Legacy', NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
    `);
    seed.close();

    const store = openStore(dbPath);
    expect(store.listChats()).toEqual([expect.objectContaining({ id: "c1", title: "Legacy" })]);
    const created = store.createChat({ title: "New chat" });
    expect(created.title).toBe("New chat");
    expect(store.listChats()).toHaveLength(2);
  });
});
