import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { HandleMessageStreamEvent } from "eve/client";
import { LEGACY_CHAT_OWNER_ID } from "@/lib/auth/principal";
import { DEFAULT_CHAT_TITLE } from "@/lib/chat/title";
import { ChatConcurrencyError, SHARED_TURN_LOCK_TTL_MS } from "@/lib/chat/store/concurrency";
import { parseSessionStateJson, parseStreamEventJson } from "@/lib/chat/store/parse";
import type {
  ChatRecord,
  ChatStore,
  ChatSummary,
  ChatVisibility,
  CreateChatInput,
  DeleteChatOptions,
  UpdateChatInput,
} from "@/lib/chat/store/types";

type SqlRow = Record<string, null | number | bigint | string | Uint8Array>;

const UNSET_WORKSPACE_ID = "__unset__";

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

function parseVisibility(value: unknown): ChatVisibility {
  return value === "shared" ? "shared" : "personal";
}

function toSummary(row: SqlRow): ChatSummary {
  return {
    id: requireString(row, "id"),
    title: requireString(row, "title"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
    visibility: parseVisibility(row["visibility"]),
    userId: requireString(row, "user_id"),
    revision: requireNumber(row, "revision"),
  };
}

function lockExpiresAt(now: string): string {
  return new Date(Date.parse(now) + SHARED_TURN_LOCK_TTL_MS).toISOString();
}

function isLockActive(row: SqlRow, now: string): boolean {
  const until = optionalString(row, "turn_lock_until");
  if (!until) {
    return false;
  }
  return Date.parse(until) > Date.parse(now);
}

function lockHolder(row: SqlRow): string | null {
  return optionalString(row, "turn_lock_user_id");
}

function toRecord(row: SqlRow, events: readonly HandleMessageStreamEvent[]): ChatRecord {
  const sessionRaw = optionalString(row, "eve_session");
  return {
    ...toSummary(row),
    workspaceId: requireString(row, "workspace_id"),
    eveSession: sessionRaw ? parseSessionStateJson(sessionRaw) : null,
    events,
  };
}

function migrateSchema(db: DatabaseSync) {
  const columns = db.prepare("PRAGMA table_info(chat)").all() as readonly SqlRow[];
  const names = new Set(
    columns
      .map((column) => optionalString(column, "name"))
      .filter((name): name is string => Boolean(name)),
  );
  if (!names.has("user_id")) {
    db.exec(`ALTER TABLE chat ADD COLUMN user_id TEXT NOT NULL DEFAULT '${LEGACY_CHAT_OWNER_ID}'`);
  }
  if (!names.has("workspace_id")) {
    db.exec(
      `ALTER TABLE chat ADD COLUMN workspace_id TEXT NOT NULL DEFAULT '${UNSET_WORKSPACE_ID}'`,
    );
  }
  if (!names.has("visibility")) {
    db.exec(`ALTER TABLE chat ADD COLUMN visibility TEXT NOT NULL DEFAULT 'personal'`);
  }
  if (!names.has("revision")) {
    db.exec(`ALTER TABLE chat ADD COLUMN revision INTEGER NOT NULL DEFAULT 0`);
  }
  if (!names.has("turn_lock_user_id")) {
    db.exec(`ALTER TABLE chat ADD COLUMN turn_lock_user_id TEXT`);
  }
  if (!names.has("turn_lock_until")) {
    db.exec(`ALTER TABLE chat ADD COLUMN turn_lock_until TEXT`);
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS chat_user_workspace_updated_at_idx
      ON chat(user_id, workspace_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS chat_workspace_visibility_updated_at_idx
      ON chat(workspace_id, visibility, updated_at DESC);
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
      workspace_id TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'personal',
      title TEXT NOT NULL,
      eve_session TEXT,
      revision INTEGER NOT NULL DEFAULT 0,
      turn_lock_user_id TEXT,
      turn_lock_until TEXT,
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

  const selectAccessibleChat = db.prepare(
    `SELECT * FROM chat
     WHERE id = ?
       AND workspace_id = ?
       AND (user_id = ? OR visibility = 'shared')`,
  );
  const selectEvents = db.prepare(
    "SELECT event FROM chat_event WHERE chat_id = ? ORDER BY event_index ASC",
  );
  const selectNextIndex = db.prepare(
    "SELECT COALESCE(MAX(event_index) + 1, 0) AS next_index FROM chat_event WHERE chat_id = ?",
  );
  const listChatsStmt = db.prepare(
    `SELECT id, title, eve_session, created_at, updated_at, user_id, workspace_id, visibility, revision
     FROM chat
     WHERE workspace_id = ?
       AND (user_id = ? OR visibility = 'shared')
     ORDER BY updated_at DESC`,
  );
  const insertChat = db.prepare(
    `INSERT INTO chat (
       id, user_id, workspace_id, visibility, title, eve_session, revision,
       turn_lock_user_id, turn_lock_until, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, NULL, 0, NULL, NULL, ?, ?)`,
  );
  const updateTitle = db.prepare(
    "UPDATE chat SET title = ?, updated_at = ? WHERE id = ? AND workspace_id = ?",
  );
  const updateVisibility = db.prepare(
    "UPDATE chat SET visibility = ?, updated_at = ? WHERE id = ? AND workspace_id = ?",
  );
  const updateSession = db.prepare(
    "UPDATE chat SET eve_session = ?, updated_at = ? WHERE id = ? AND workspace_id = ?",
  );
  const touchUpdated = db.prepare(
    "UPDATE chat SET updated_at = ? WHERE id = ? AND workspace_id = ?",
  );
  const bumpRevision = db.prepare(
    `UPDATE chat SET updated_at = ?, revision = revision + 1
     WHERE id = ? AND workspace_id = ?`,
  );
  const bumpRevisionCas = db.prepare(
    `UPDATE chat SET updated_at = ?, revision = revision + 1
     WHERE id = ? AND workspace_id = ? AND revision = ?`,
  );
  const setTurnLock = db.prepare(
    `UPDATE chat SET turn_lock_user_id = ?, turn_lock_until = ?, updated_at = ?
     WHERE id = ? AND workspace_id = ?`,
  );
  const insertEvent = db.prepare(
    "INSERT OR IGNORE INTO chat_event (chat_id, event_index, event) VALUES (?, ?, ?)",
  );
  const deleteEvents = db.prepare("DELETE FROM chat_event WHERE chat_id = ?");
  const deleteChatStmt = db.prepare("DELETE FROM chat WHERE id = ? AND workspace_id = ?");
  const reassignStmt = db.prepare("UPDATE chat SET user_id = ? WHERE user_id = ?");
  const assignWorkspaceStmt = db.prepare(
    `UPDATE chat SET workspace_id = ?
     WHERE user_id = ? AND (workspace_id = ? OR workspace_id = '')`,
  );

  function loadEvents(chatId: string): HandleMessageStreamEvent[] {
    return selectEvents.all(chatId).map((row) => parseStreamEventJson(requireString(row, "event")));
  }

  function getChatRow(userId: string, workspaceId: string, id: string): SqlRow | null {
    return selectAccessibleChat.get(id, workspaceId, userId) ?? null;
  }

  function getChat(userId: string, workspaceId: string, id: string): ChatRecord | null {
    const row = getChatRow(userId, workspaceId, id);
    if (!row) {
      return null;
    }
    return toRecord(row, loadEvents(id));
  }

  return {
    createChat(userId: string, input: CreateChatInput): ChatRecord {
      const workspaceId = input.workspaceId.trim();
      if (!workspaceId) {
        throw new Error("workspaceId is required to create a chat.");
      }
      const visibility: ChatVisibility = input.visibility === "shared" ? "shared" : "personal";
      const id = input.id?.trim() || randomUUID();
      const title = input.title?.trim() || DEFAULT_CHAT_TITLE;
      const createdAt = nowIso();
      insertChat.run(id, userId, workspaceId, visibility, title, createdAt, createdAt);
      const created = getChat(userId, workspaceId, id);
      if (!created) {
        throw new Error(`Failed to create chat ${id}`);
      }
      return created;
    },

    listChats(userId: string, workspaceId: string): readonly ChatSummary[] {
      return listChatsStmt.all(workspaceId, userId).map(toSummary);
    },

    getChat,

    updateChat(
      userId: string,
      workspaceId: string,
      id: string,
      input: UpdateChatInput,
    ): ChatRecord | null {
      const existing = getChatRow(userId, workspaceId, id);
      if (!existing) {
        return null;
      }

      db.exec("BEGIN IMMEDIATE");
      try {
        // Re-read under the transaction for a consistent snapshot.
        const lockedExisting = getChatRow(userId, workspaceId, id);
        if (!lockedExisting) {
          db.exec("ROLLBACK");
          return null;
        }

        const updatedAt = nowIso();
        const visibility = parseVisibility(lockedExisting["visibility"]);

        if (input.turnLock !== undefined) {
          if (visibility !== "shared") {
            throw new ChatConcurrencyError("Turn locks apply only to shared chats.");
          }
          const holder = lockHolder(lockedExisting);
          const active = isLockActive(lockedExisting, updatedAt);
          if (input.turnLock === "acquire") {
            if (active && holder !== userId) {
              throw new ChatConcurrencyError(
                "Another member is currently running a turn in this chat.",
              );
            }
            setTurnLock.run(userId, lockExpiresAt(updatedAt), updatedAt, id, workspaceId);
          } else if (input.turnLock === "heartbeat") {
            if (!active || holder !== userId) {
              throw new ChatConcurrencyError("Turn lock is not held by this member.");
            }
            setTurnLock.run(userId, lockExpiresAt(updatedAt), updatedAt, id, workspaceId);
          } else if (active && holder !== userId) {
            throw new ChatConcurrencyError("Turn lock is not held by this member.");
          } else {
            setTurnLock.run(null, null, updatedAt, id, workspaceId);
          }
        }

        const hasTurnContent =
          input.eveSession !== undefined ||
          input.events !== undefined ||
          Boolean(input.appendEvents && input.appendEvents.length > 0);

        let willPromoteToShared = false;
        if (input.visibility !== undefined) {
          const ownerId = requireString(lockedExisting, "user_id");
          const currentVisibility = parseVisibility(lockedExisting["visibility"]);
          // Only the creator may promote personal → shared (idempotent if already shared).
          if (ownerId !== userId || input.visibility !== "shared") {
            db.exec("ROLLBACK");
            return null;
          }
          willPromoteToShared = currentVisibility !== "shared";
        }

        const hasMetaContent = input.title !== undefined || willPromoteToShared;
        const hasContent = hasTurnContent || hasMetaContent;

        if (!hasContent) {
          db.exec("COMMIT");
          return getChat(userId, workspaceId, id);
        }

        const rowForCas = getChatRow(userId, workspaceId, id) ?? lockedExisting;
        const revisionForCas = requireNumber(rowForCas, "revision");
        const visibilityForCas = parseVisibility(rowForCas["visibility"]);
        const useCas = visibilityForCas === "shared" || input.expectedRevision !== undefined;

        if (visibilityForCas === "shared") {
          if (input.expectedRevision === undefined) {
            throw new ChatConcurrencyError("expectedRevision is required for shared chat updates.");
          }
          if (input.expectedRevision !== revisionForCas) {
            throw new ChatConcurrencyError(
              "Chat was updated by another member. Refresh and try again.",
            );
          }
          if (hasTurnContent) {
            const holder = lockHolder(rowForCas);
            if (!isLockActive(rowForCas, updatedAt) || holder !== userId) {
              throw new ChatConcurrencyError(
                "Acquire the turn lock before updating shared chat content.",
              );
            }
          }
        } else if (
          input.expectedRevision !== undefined &&
          input.expectedRevision !== revisionForCas
        ) {
          throw new ChatConcurrencyError(
            "Chat was updated by another member. Refresh and try again.",
          );
        }

        let touched = false;

        if (input.title !== undefined) {
          const title = input.title.trim() || DEFAULT_CHAT_TITLE;
          updateTitle.run(title, updatedAt, id, workspaceId);
          touched = true;
        }

        if (willPromoteToShared) {
          updateVisibility.run("shared", updatedAt, id, workspaceId);
          touched = true;
        }

        if (input.eveSession !== undefined) {
          const sessionJson = input.eveSession === null ? null : JSON.stringify(input.eveSession);
          updateSession.run(sessionJson, updatedAt, id, workspaceId);
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

        if (!touched) {
          db.exec("COMMIT");
          return getChat(userId, workspaceId, id);
        }

        if (input.title === undefined && input.eveSession === undefined) {
          touchUpdated.run(updatedAt, id, workspaceId);
        }

        if (useCas) {
          const bumped = bumpRevisionCas.run(updatedAt, id, workspaceId, revisionForCas);
          if (Number(bumped.changes) === 0) {
            throw new ChatConcurrencyError(
              "Chat was updated by another member. Refresh and try again.",
            );
          }
        } else {
          bumpRevision.run(updatedAt, id, workspaceId);
        }

        db.exec("COMMIT");
        return getChat(userId, workspaceId, id);
      } catch (error) {
        try {
          db.exec("ROLLBACK");
        } catch {
          // Ignore rollback failures when the transaction already ended.
        }
        throw error;
      }
    },

    deleteChat(
      userId: string,
      workspaceId: string,
      id: string,
      options?: DeleteChatOptions,
    ): boolean {
      const existing = getChatRow(userId, workspaceId, id);
      if (!existing) {
        return false;
      }
      const ownerId = requireString(existing, "user_id");
      const visibility = parseVisibility(existing["visibility"]);
      const isOwner = ownerId === userId;
      if (visibility === "personal") {
        if (!isOwner) {
          return false;
        }
      } else if (!isOwner && !options?.moderateShared) {
        return false;
      }
      const result = deleteChatStmt.run(id, workspaceId);
      return result.changes > 0;
    },

    reassignOwner(fromUserId: string, toUserId: string): number {
      const result = reassignStmt.run(toUserId, fromUserId);
      return Number(result.changes);
    },

    assignWorkspaceToUserChats(userId: string, workspaceId: string): number {
      const result = assignWorkspaceStmt.run(workspaceId, userId, UNSET_WORKSPACE_ID);
      return Number(result.changes);
    },

    close(): void {
      db.close();
    },
  };
}
