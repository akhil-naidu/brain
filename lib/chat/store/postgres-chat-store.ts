import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { HandleMessageStreamEvent } from "eve/client";
import { DEFAULT_CHAT_TITLE } from "@/lib/chat/title";
import { ChatConcurrencyError, SHARED_TURN_LOCK_TTL_MS } from "@/lib/chat/store/concurrency";
import { parseSessionStateJson, parseStreamEventJson } from "@/lib/chat/store/parse";
import { getPool, withTransaction } from "@/lib/db/pool";
import type {
  ChatRecord,
  ChatStore,
  ChatSummary,
  ChatVisibility,
  CreateChatInput,
  DeleteChatOptions,
  UpdateChatInput,
} from "@/lib/chat/store/types";

const UNSET_WORKSPACE_ID = "__unset__";

type PgRow = Record<string, unknown>;

function nowIso(): string {
  return new Date().toISOString();
}

function requireString(row: PgRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected string column ${key}, got ${typeof value}`);
  }
  return value;
}

function optionalString(row: PgRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected string or null column ${key}`);
  }
  return value;
}

function requireNumber(row: PgRow, key: string): number {
  const value = row[key];
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  // pg returns integers as JS numbers, but handle string just in case
  if (typeof value === "string") {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  throw new Error(`Expected numeric column ${key}, got ${typeof value}`);
}

function parseVisibility(value: unknown): ChatVisibility {
  return value === "shared" ? "shared" : "personal";
}

function lockExpiresAt(now: string): string {
  return new Date(Date.parse(now) + SHARED_TURN_LOCK_TTL_MS).toISOString();
}

function isLockActive(row: PgRow, now: string): boolean {
  const until = optionalString(row, "turn_lock_until");
  if (!until) return false;
  return Date.parse(until) > Date.parse(now);
}

function lockHolder(row: PgRow): string | null {
  return optionalString(row, "turn_lock_user_id");
}

function toSummary(row: PgRow): ChatSummary {
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

async function loadEvents(client: PoolClient, chatId: string): Promise<HandleMessageStreamEvent[]> {
  const result = await client.query<PgRow>(
    "SELECT event FROM chat_event WHERE chat_id = $1 ORDER BY event_index ASC",
    [chatId],
  );
  return result.rows.map((row) => parseStreamEventJson(requireString(row, "event")));
}

async function loadEventsFromPool(chatId: string): Promise<HandleMessageStreamEvent[]> {
  const result = await getPool().query<PgRow>(
    "SELECT event FROM chat_event WHERE chat_id = $1 ORDER BY event_index ASC",
    [chatId],
  );
  return result.rows.map((row) => parseStreamEventJson(requireString(row, "event")));
}

function toRecord(row: PgRow, events: readonly HandleMessageStreamEvent[]): ChatRecord {
  const sessionRaw = optionalString(row, "eve_session");
  return {
    ...toSummary(row),
    workspaceId: requireString(row, "workspace_id"),
    eveSession: sessionRaw ? parseSessionStateJson(sessionRaw) : null,
    events,
  };
}

const ACCESSIBLE_CHAT_SQL = `
  SELECT * FROM chat
  WHERE id = $1
    AND workspace_id = $2
    AND (user_id = $3 OR visibility = 'shared')
`;

const ACCESSIBLE_CHAT_FOR_UPDATE_SQL = `
  SELECT * FROM chat
  WHERE id = $1
    AND workspace_id = $2
    AND (user_id = $3 OR visibility = 'shared')
  FOR UPDATE
`;

export function createPostgresChatStore(): ChatStore {
  const pool = getPool();

  return {
    async createChat(userId: string, input: CreateChatInput): Promise<ChatRecord> {
      const workspaceId = input.workspaceId.trim();
      if (!workspaceId) {
        throw new Error("workspaceId is required to create a chat.");
      }
      const visibility: ChatVisibility = input.visibility === "shared" ? "shared" : "personal";
      const id = input.id?.trim() || randomUUID();
      const title = input.title?.trim() || DEFAULT_CHAT_TITLE;
      const createdAt = nowIso();

      await pool.query(
        `INSERT INTO chat (
           id, user_id, workspace_id, visibility, title, eve_session, revision,
           turn_lock_user_id, turn_lock_until, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, NULL, 0, NULL, NULL, $6, $7)`,
        [id, userId, workspaceId, visibility, title, createdAt, createdAt],
      );

      const result = await pool.query<PgRow>(ACCESSIBLE_CHAT_SQL, [id, workspaceId, userId]);
      const row = result.rows[0];
      if (!row) {
        throw new Error(`Failed to create chat ${id}`);
      }
      const events = await loadEventsFromPool(id);
      return toRecord(row, events);
    },

    async listChats(userId: string, workspaceId: string): Promise<readonly ChatSummary[]> {
      const result = await pool.query<PgRow>(
        `SELECT id, title, eve_session, created_at, updated_at, user_id, workspace_id, visibility, revision
         FROM chat
         WHERE workspace_id = $1
           AND (user_id = $2 OR visibility = 'shared')
         ORDER BY updated_at DESC`,
        [workspaceId, userId],
      );
      return result.rows.map(toSummary);
    },

    async getChat(userId: string, workspaceId: string, id: string): Promise<ChatRecord | null> {
      const result = await pool.query<PgRow>(ACCESSIBLE_CHAT_SQL, [id, workspaceId, userId]);
      const row = result.rows[0];
      if (!row) return null;
      const events = await loadEventsFromPool(id);
      return toRecord(row, events);
    },

    async updateChat(
      userId: string,
      workspaceId: string,
      id: string,
      input: UpdateChatInput,
    ): Promise<ChatRecord | null> {
      return withTransaction(async (client: PoolClient) => {
        // Lock the row for the duration of the transaction.
        const lockResult = await client.query<PgRow>(ACCESSIBLE_CHAT_FOR_UPDATE_SQL, [
          id,
          workspaceId,
          userId,
        ]);
        const existing = lockResult.rows[0];
        if (!existing) return null;

        const updatedAt = nowIso();
        const visibility = parseVisibility(existing["visibility"]);

        if (input.turnLock !== undefined) {
          if (visibility !== "shared") {
            throw new ChatConcurrencyError("Turn locks apply only to shared chats.");
          }
          const holder = lockHolder(existing);
          const active = isLockActive(existing, updatedAt);
          if (input.turnLock === "acquire") {
            if (active && holder !== userId) {
              throw new ChatConcurrencyError(
                "Another member is currently running a turn in this chat.",
              );
            }
            await client.query(
              `UPDATE chat SET turn_lock_user_id = $1, turn_lock_until = $2, updated_at = $3
               WHERE id = $4 AND workspace_id = $5`,
              [userId, lockExpiresAt(updatedAt), updatedAt, id, workspaceId],
            );
          } else if (input.turnLock === "heartbeat") {
            if (!active || holder !== userId) {
              throw new ChatConcurrencyError("Turn lock is not held by this member.");
            }
            await client.query(
              `UPDATE chat SET turn_lock_user_id = $1, turn_lock_until = $2, updated_at = $3
               WHERE id = $4 AND workspace_id = $5`,
              [userId, lockExpiresAt(updatedAt), updatedAt, id, workspaceId],
            );
          } else {
            // release
            if (isLockActive(existing, updatedAt) && lockHolder(existing) !== userId) {
              throw new ChatConcurrencyError("Turn lock is not held by this member.");
            }
            await client.query(
              `UPDATE chat SET turn_lock_user_id = NULL, turn_lock_until = NULL, updated_at = $1
               WHERE id = $2 AND workspace_id = $3`,
              [updatedAt, id, workspaceId],
            );
          }
        }

        const hasTurnContent =
          input.eveSession !== undefined ||
          input.events !== undefined ||
          Boolean(input.appendEvents && input.appendEvents.length > 0);

        let willPromoteToShared = false;
        if (input.visibility !== undefined) {
          const ownerId = requireString(existing, "user_id");
          const currentVisibility = parseVisibility(existing["visibility"]);
          // Only the creator may promote personal → shared (idempotent if already shared).
          if (ownerId !== userId || input.visibility !== "shared") {
            return null;
          }
          willPromoteToShared = currentVisibility !== "shared";
        }

        const hasMetaContent = input.title !== undefined || willPromoteToShared;
        const hasContent = hasTurnContent || hasMetaContent;

        if (!hasContent) {
          // Re-read to return the current state (lock is still held).
          const refreshed = await client.query<PgRow>(ACCESSIBLE_CHAT_SQL, [
            id,
            workspaceId,
            userId,
          ]);
          const refreshedRow = refreshed.rows[0];
          if (!refreshedRow) return null;
          const events = await loadEvents(client, id);
          return toRecord(refreshedRow, events);
        }

        // Re-read the row for CAS checks (already locked above, same data).
        const revisionForCas = requireNumber(existing, "revision");
        const visibilityForCas = parseVisibility(existing["visibility"]);
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
            // Re-read lock state from the locked row.
            const holder = lockHolder(existing);
            if (!isLockActive(existing, updatedAt) || holder !== userId) {
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
          await client.query(
            "UPDATE chat SET title = $1, updated_at = $2 WHERE id = $3 AND workspace_id = $4",
            [title, updatedAt, id, workspaceId],
          );
          touched = true;
        }

        if (willPromoteToShared) {
          await client.query(
            "UPDATE chat SET visibility = $1, updated_at = $2 WHERE id = $3 AND workspace_id = $4",
            ["shared", updatedAt, id, workspaceId],
          );
          touched = true;
        }

        if (input.eveSession !== undefined) {
          const sessionJson = input.eveSession === null ? null : JSON.stringify(input.eveSession);
          await client.query(
            "UPDATE chat SET eve_session = $1, updated_at = $2 WHERE id = $3 AND workspace_id = $4",
            [sessionJson, updatedAt, id, workspaceId],
          );
          touched = true;
        }

        if (input.events !== undefined) {
          await client.query("DELETE FROM chat_event WHERE chat_id = $1", [id]);
          await Promise.all(
            input.events.map((event, index) =>
              client.query(
                `INSERT INTO chat_event (chat_id, event_index, event)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (chat_id, event_index) DO NOTHING`,
                [id, index, JSON.stringify(event)],
              ),
            ),
          );
          touched = true;
        } else if (input.appendEvents && input.appendEvents.length > 0) {
          const nextResult = await client.query<PgRow>(
            "SELECT COALESCE(MAX(event_index) + 1, 0) AS next_index FROM chat_event WHERE chat_id = $1",
            [id],
          );
          const startIndex = nextResult.rows[0]
            ? requireNumber(nextResult.rows[0], "next_index")
            : 0;
          await Promise.all(
            input.appendEvents.map((event, offset) =>
              client.query(
                `INSERT INTO chat_event (chat_id, event_index, event)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (chat_id, event_index) DO NOTHING`,
                [id, startIndex + offset, JSON.stringify(event)],
              ),
            ),
          );
          touched = true;
        }

        if (!touched) {
          const refreshed = await client.query<PgRow>(ACCESSIBLE_CHAT_SQL, [
            id,
            workspaceId,
            userId,
          ]);
          const refreshedRow = refreshed.rows[0];
          if (!refreshedRow) return null;
          const events = await loadEvents(client, id);
          return toRecord(refreshedRow, events);
        }

        // Touch updated_at if we only wrote events (title/session already set it).
        if (input.title === undefined && input.eveSession === undefined) {
          await client.query(
            "UPDATE chat SET updated_at = $1 WHERE id = $2 AND workspace_id = $3",
            [updatedAt, id, workspaceId],
          );
        }

        if (useCas) {
          const bumped = await client.query(
            `UPDATE chat SET updated_at = $1, revision = revision + 1
             WHERE id = $2 AND workspace_id = $3 AND revision = $4`,
            [updatedAt, id, workspaceId, revisionForCas],
          );
          if ((bumped.rowCount ?? 0) === 0) {
            throw new ChatConcurrencyError(
              "Chat was updated by another member. Refresh and try again.",
            );
          }
        } else {
          await client.query(
            `UPDATE chat SET updated_at = $1, revision = revision + 1
             WHERE id = $2 AND workspace_id = $3`,
            [updatedAt, id, workspaceId],
          );
        }

        // Read the final state inside the transaction so we see all our writes.
        const finalResult = await client.query<PgRow>(ACCESSIBLE_CHAT_SQL, [
          id,
          workspaceId,
          userId,
        ]);
        const finalRow = finalResult.rows[0];
        if (!finalRow) return null;
        const events = await loadEvents(client, id);
        return toRecord(finalRow, events);
      });
    },

    async deleteChat(
      userId: string,
      workspaceId: string,
      id: string,
      options?: DeleteChatOptions,
    ): Promise<boolean> {
      // Check accessibility and ownership before deleting.
      const result = await pool.query<PgRow>(ACCESSIBLE_CHAT_SQL, [id, workspaceId, userId]);
      const existing = result.rows[0];
      if (!existing) return false;

      const ownerId = requireString(existing, "user_id");
      const visibility = parseVisibility(existing["visibility"]);
      const isOwner = ownerId === userId;

      if (visibility === "personal") {
        if (!isOwner) return false;
      } else if (!isOwner && !options?.moderateShared) {
        return false;
      }

      const del = await pool.query("DELETE FROM chat WHERE id = $1 AND workspace_id = $2", [
        id,
        workspaceId,
      ]);
      return (del.rowCount ?? 0) > 0;
    },

    async reassignOwner(fromUserId: string, toUserId: string): Promise<number> {
      const result = await pool.query("UPDATE chat SET user_id = $1 WHERE user_id = $2", [
        toUserId,
        fromUserId,
      ]);
      return result.rowCount ?? 0;
    },

    async assignWorkspaceToUserChats(userId: string, workspaceId: string): Promise<number> {
      const result = await pool.query(
        `UPDATE chat SET workspace_id = $1
         WHERE user_id = $2 AND (workspace_id = $3 OR workspace_id = '')`,
        [workspaceId, userId, UNSET_WORKSPACE_ID],
      );
      return result.rowCount ?? 0;
    },

    close(): void {
      // Pool lifecycle is managed globally; nothing to close per-store instance.
    },
  };
}
