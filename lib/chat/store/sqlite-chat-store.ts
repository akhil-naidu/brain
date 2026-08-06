import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { HandleMessageStreamEvent } from "eve/client";
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
    eveSession: sessionRaw ? parseSessionStateJson(sessionRaw) : null,
    events,
  };
}

function tableColumns(db: DatabaseSync, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as SqlRow[];
  return new Set(
    rows
      .map((row) => optionalString(row, "name"))
      .filter((name): name is string => typeof name === "string"),
  );
}

/** Drop legacy multi-tenant columns (user_id / workspace_id) from older Brain DBs. */
function migrateLegacyChatSchema(db: DatabaseSync): void {
  const columns = tableColumns(db, "chat");
  if (columns.size === 0 || !columns.has("user_id")) {
    return;
  }

  // Rebuild `chat` in place. Keep `chat_event` rows; FK checks are off during swap.
  db.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN;
    DROP INDEX IF EXISTS chat_updated_at_idx;
    DROP INDEX IF EXISTS chat_user_workspace_updated_at_idx;
    DROP INDEX IF EXISTS chat_workspace_visibility_updated_at_idx;
    CREATE TABLE chat_new (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      eve_session TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO chat_new (id, title, eve_session, created_at, updated_at)
      SELECT id, title, eve_session, created_at, updated_at FROM chat;
    DROP TABLE chat;
    ALTER TABLE chat_new RENAME TO chat;
    CREATE INDEX IF NOT EXISTS chat_updated_at_idx ON chat(updated_at DESC);
    COMMIT;
    PRAGMA foreign_keys = ON;
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
  migrateLegacyChatSchema(db);

  const selectChat = db.prepare("SELECT * FROM chat WHERE id = ?");
  const selectEvents = db.prepare(
    "SELECT event FROM chat_event WHERE chat_id = ? ORDER BY event_index ASC",
  );
  const selectNextIndex = db.prepare(
    "SELECT COALESCE(MAX(event_index) + 1, 0) AS next_index FROM chat_event WHERE chat_id = ?",
  );
  const listChatsStmt = db.prepare(
    "SELECT id, title, eve_session, created_at, updated_at FROM chat ORDER BY updated_at DESC",
  );
  const insertChat = db.prepare(
    "INSERT INTO chat (id, title, eve_session, created_at, updated_at) VALUES (?, ?, NULL, ?, ?)",
  );
  const updateTitle = db.prepare("UPDATE chat SET title = ?, updated_at = ? WHERE id = ?");
  const updateSession = db.prepare("UPDATE chat SET eve_session = ?, updated_at = ? WHERE id = ?");
  const touchUpdated = db.prepare("UPDATE chat SET updated_at = ? WHERE id = ?");
  const insertEvent = db.prepare(
    "INSERT OR IGNORE INTO chat_event (chat_id, event_index, event) VALUES (?, ?, ?)",
  );
  const deleteEvents = db.prepare("DELETE FROM chat_event WHERE chat_id = ?");
  const deleteChatStmt = db.prepare("DELETE FROM chat WHERE id = ?");

  function loadEvents(chatId: string): HandleMessageStreamEvent[] {
    return selectEvents.all(chatId).map((row) => parseStreamEventJson(requireString(row, "event")));
  }

  function getChatRow(id: string): SqlRow | null {
    return selectChat.get(id) ?? null;
  }

  function getChat(id: string): ChatRecord | null {
    const row = getChatRow(id);
    if (!row) {
      return null;
    }
    return toRecord(row, loadEvents(id));
  }

  return {
    createChat(input: CreateChatInput = {}): ChatRecord {
      const id = input.id?.trim() || randomUUID();
      const title = input.title?.trim() || DEFAULT_CHAT_TITLE;
      const createdAt = nowIso();
      insertChat.run(id, title, createdAt, createdAt);
      const created = getChat(id);
      if (!created) {
        throw new Error(`Failed to create chat ${id}`);
      }
      return created;
    },

    listChats(): readonly ChatSummary[] {
      return listChatsStmt.all().map(toSummary);
    },

    getChat,

    updateChat(id: string, input: UpdateChatInput): ChatRecord | null {
      const existing = getChatRow(id);
      if (!existing) {
        return null;
      }

      const updatedAt = nowIso();
      let touched = false;

      if (input.title !== undefined) {
        const title = input.title.trim() || DEFAULT_CHAT_TITLE;
        updateTitle.run(title, updatedAt, id);
        touched = true;
      }

      if (input.eveSession !== undefined) {
        const sessionJson = input.eveSession === null ? null : JSON.stringify(input.eveSession);
        updateSession.run(sessionJson, updatedAt, id);
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
        touchUpdated.run(updatedAt, id);
      }

      return getChat(id);
    },

    deleteChat(id: string): boolean {
      const result = deleteChatStmt.run(id);
      return result.changes > 0;
    },

    close(): void {
      db.close();
    },
  };
}
