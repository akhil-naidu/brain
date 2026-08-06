import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { HandleMessageStreamEvent } from "eve/client";
import { LEGACY_CHAT_OWNER_ID } from "@/lib/auth/principal";
import { DEFAULT_CHAT_TITLE } from "@/lib/chat/title";
import { parseSessionStateJson, parseStreamEventJson } from "@/lib/chat/store/parse";
import type {
  ChatRecord,
  ChatStore,
  ChatSummary,
  CreateChatInput,
  UpdateChatInput,
} from "@/lib/chat/store/types";

type SqlRow = Record<string, null | number | bigint | string | Uint8Array>;

function nowIso() {
  return new Date().toISOString();
}

function requireString(row: SqlRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected string column ${key}`);
  }
  return value;
}

function optionalString(row: SqlRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected string or null column ${key}`);
  }
  return value;
}

function requireNumber(row: SqlRow, key: string): number {
  const value = row[key];
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  throw new Error(`Expected numeric column ${key}`);
}

function toSummary(row: SqlRow): ChatSummary {
  return {
    id: requireString(row, "id"),
    title: requireString(row, "title"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function toRecord(row: SqlRow, events: readonly HandleMessageStreamEvent[]): ChatRecord {
  const sessionRaw = optionalString(row, "eve_session");
  return {
    ...toSummary(row),
    userId: requireString(row, "user_id"),
    eveSession: sessionRaw ? parseSessionStateJson(sessionRaw) : null,
    events,
  };
}

function migrateSchema(db: DatabaseSync) {
  const columns = db.prepare("PRAGMA table_info(chat)").all() as readonly SqlRow[];
  const hasUserId = columns.some((column) => optionalString(column, "name") === "user_id");
  if (!hasUserId) {
    db.exec(`ALTER TABLE chat ADD COLUMN user_id TEXT NOT NULL DEFAULT '${LEGACY_CHAT_OWNER_ID}'`);
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS chat_user_updated_at_idx ON chat(user_id, updated_at DESC);
  `);
}

export function createSqliteChatStore(dbPath: string): ChatStore {
  if (dbPath !== ":memory:") {
    mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS chat (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      eve_session TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_event (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL REFERENCES chat(id) ON DELETE CASCADE,
      event_index INTEGER NOT NULL,
      event TEXT NOT NULL,
      UNIQUE(chat_id, event_index)
    );
    CREATE INDEX IF NOT EXISTS chat_updated_at_idx ON chat(updated_at DESC);
    CREATE INDEX IF NOT EXISTS chat_event_chat_id_idx ON chat_event(chat_id, event_index);
  `);
  migrateSchema(db);

  const selectChat = db.prepare("SELECT * FROM chat WHERE id = ? AND user_id = ?");
  const selectEvents = db.prepare(
    "SELECT event FROM chat_event WHERE chat_id = ? ORDER BY event_index ASC",
  );
  const selectNextIndex = db.prepare(
    "SELECT COALESCE(MAX(event_index) + 1, 0) AS next_index FROM chat_event WHERE chat_id = ?",
  );
  const listChatsStmt = db.prepare(
    "SELECT id, title, eve_session, created_at, updated_at, user_id FROM chat WHERE user_id = ? ORDER BY updated_at DESC",
  );
  const insertChat = db.prepare(
    "INSERT INTO chat (id, user_id, title, eve_session, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?)",
  );
  const updateTitle = db.prepare(
    "UPDATE chat SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?",
  );
  const updateSession = db.prepare(
    "UPDATE chat SET eve_session = ?, updated_at = ? WHERE id = ? AND user_id = ?",
  );
  const touchUpdated = db.prepare("UPDATE chat SET updated_at = ? WHERE id = ? AND user_id = ?");
  const insertEvent = db.prepare(
    "INSERT OR IGNORE INTO chat_event (chat_id, event_index, event) VALUES (?, ?, ?)",
  );
  const deleteEvents = db.prepare("DELETE FROM chat_event WHERE chat_id = ?");
  const deleteChatStmt = db.prepare("DELETE FROM chat WHERE id = ? AND user_id = ?");
  const reassignStmt = db.prepare("UPDATE chat SET user_id = ? WHERE user_id = ?");

  function loadEvents(chatId: string): HandleMessageStreamEvent[] {
    return selectEvents.all(chatId).map((row) => parseStreamEventJson(requireString(row, "event")));
  }

  function getChatRow(userId: string, id: string): SqlRow | null {
    return selectChat.get(id, userId) ?? null;
  }

  function getChat(userId: string, id: string): ChatRecord | null {
    const row = getChatRow(userId, id);
    if (!row) {
      return null;
    }
    return toRecord(row, loadEvents(id));
  }

  return {
    createChat(userId: string, input: CreateChatInput = {}): ChatRecord {
      const id = input.id?.trim() || randomUUID();
      const title = input.title?.trim() || DEFAULT_CHAT_TITLE;
      const createdAt = nowIso();
      insertChat.run(id, userId, title, createdAt, createdAt);
      const created = getChat(userId, id);
      if (!created) {
        throw new Error(`Failed to create chat ${id}`);
      }
      return created;
    },

    listChats(userId: string): readonly ChatSummary[] {
      return listChatsStmt.all(userId).map(toSummary);
    },

    getChat,

    updateChat(userId: string, id: string, input: UpdateChatInput): ChatRecord | null {
      const existing = getChatRow(userId, id);
      if (!existing) {
        return null;
      }

      const updatedAt = nowIso();
      let touched = false;

      if (input.title !== undefined) {
        const title = input.title.trim() || DEFAULT_CHAT_TITLE;
        updateTitle.run(title, updatedAt, id, userId);
        touched = true;
      }

      if (input.eveSession !== undefined) {
        const sessionJson = input.eveSession === null ? null : JSON.stringify(input.eveSession);
        updateSession.run(sessionJson, updatedAt, id, userId);
        touched = true;
      }

      if (input.events !== undefined) {
        deleteEvents.run(id);
        for (const [index, event] of input.events.entries()) {
          insertEvent.run(id, index, JSON.stringify(event));
        }
        touched = true;
      } else if (input.appendEvents && input.appendEvents.length > 0) {
        const nextRow = selectNextIndex.get(id);
        let index = nextRow ? requireNumber(nextRow, "next_index") : 0;
        for (const event of input.appendEvents) {
          insertEvent.run(id, index, JSON.stringify(event));
          index += 1;
        }
        touched = true;
      }

      if (touched && input.title === undefined && input.eveSession === undefined) {
        touchUpdated.run(updatedAt, id, userId);
      }

      return getChat(userId, id);
    },

    deleteChat(userId: string, id: string): boolean {
      const result = deleteChatStmt.run(id, userId);
      return result.changes > 0;
    },

    reassignOwner(fromUserId: string, toUserId: string): number {
      const result = reassignStmt.run(toUserId, fromUserId);
      return Number(result.changes);
    },

    close(): void {
      db.close();
    },
  };
}
