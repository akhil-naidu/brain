import type { Pool } from "pg";
import { createWorkspaceStore } from "@/lib/auth/workspaces/store";
import { getPool } from "@/lib/db/pool";
import { ensureBrainSchema } from "@/lib/db/schema";

type PgRow = Record<string, unknown>;

export type SlackIdentity = {
  readonly userId: string;
  readonly workspaceId: string;
  readonly slackTeamId: string;
  readonly slackUserId: string;
};

export type SlackThreadChat = {
  readonly slackTeamId: string;
  readonly slackChannelId: string;
  readonly slackThreadTs: string;
  readonly chatId: string;
  readonly userId: string;
  readonly workspaceId: string;
};

export type BrainEmailUser = {
  readonly id: string;
  readonly email: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function requireString(row: PgRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected string column ${key}`);
  }
  return value;
}

function toIdentity(row: PgRow): SlackIdentity {
  return {
    userId: requireString(row, "user_id"),
    workspaceId: requireString(row, "workspace_id"),
    slackTeamId: requireString(row, "slack_team_id"),
    slackUserId: requireString(row, "slack_user_id"),
  };
}

function toThreadChat(row: PgRow): SlackThreadChat {
  return {
    slackTeamId: requireString(row, "slack_team_id"),
    slackChannelId: requireString(row, "slack_channel_id"),
    slackThreadTs: requireString(row, "slack_thread_ts"),
    chatId: requireString(row, "chat_id"),
    userId: requireString(row, "user_id"),
    workspaceId: requireString(row, "workspace_id"),
  };
}

async function defaultFindUsersByEmail(
  pool: Pool,
  email: string,
): Promise<readonly BrainEmailUser[]> {
  const result = await pool.query<PgRow>(
    `SELECT id, email FROM "user" WHERE lower(email) = lower($1)`,
    [email.trim()],
  );
  return result.rows.flatMap((row) => {
    const id = row["id"];
    const rowEmail = row["email"];
    if (typeof id !== "string" || typeof rowEmail !== "string") {
      return [];
    }
    return [{ id, email: rowEmail }];
  });
}

export function createSlackInboundStore(pool: Pool) {
  async function upsertIdentity(input: SlackIdentity): Promise<SlackIdentity> {
    await ensureBrainSchema(pool);
    const updatedAt = nowIso();
    await pool.query(
      `DELETE FROM brain_slack_identity
       WHERE user_id = $1 AND workspace_id = $2
          OR (slack_team_id = $3 AND slack_user_id = $4)`,
      [input.userId, input.workspaceId, input.slackTeamId, input.slackUserId],
    );
    await pool.query(
      `INSERT INTO brain_slack_identity (
         user_id, workspace_id, slack_team_id, slack_user_id, updated_at
       ) VALUES ($1, $2, $3, $4, $5)`,
      [input.userId, input.workspaceId, input.slackTeamId, input.slackUserId, updatedAt],
    );
    return input;
  }

  async function lookupBySlackUser(
    slackTeamId: string,
    slackUserId: string,
  ): Promise<SlackIdentity | null> {
    await ensureBrainSchema(pool);
    const result = await pool.query<PgRow>(
      `SELECT user_id, workspace_id, slack_team_id, slack_user_id
       FROM brain_slack_identity
       WHERE slack_team_id = $1 AND slack_user_id = $2
       LIMIT 1`,
      [slackTeamId.trim(), slackUserId.trim()],
    );
    const row = result.rows[0];
    return row ? toIdentity(row) : null;
  }

  async function deleteIdentity(userId: string, workspaceId: string): Promise<void> {
    await ensureBrainSchema(pool);
    await pool.query(`DELETE FROM brain_slack_identity WHERE user_id = $1 AND workspace_id = $2`, [
      userId.trim(),
      workspaceId.trim(),
    ]);
  }

  async function latestIdentityForUser(userId: string): Promise<SlackIdentity | null> {
    await ensureBrainSchema(pool);
    const result = await pool.query<PgRow>(
      `SELECT user_id, workspace_id, slack_team_id, slack_user_id
       FROM brain_slack_identity
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId.trim()],
    );
    const row = result.rows[0];
    return row ? toIdentity(row) : null;
  }

  async function getThreadChat(
    slackTeamId: string,
    slackChannelId: string,
    slackThreadTs: string,
  ): Promise<SlackThreadChat | null> {
    await ensureBrainSchema(pool);
    const result = await pool.query<PgRow>(
      `SELECT slack_team_id, slack_channel_id, slack_thread_ts, chat_id, user_id, workspace_id
       FROM brain_slack_thread_chat
       WHERE slack_team_id = $1 AND slack_channel_id = $2 AND slack_thread_ts = $3
       LIMIT 1`,
      [slackTeamId.trim(), slackChannelId.trim(), slackThreadTs.trim()],
    );
    const row = result.rows[0];
    return row ? toThreadChat(row) : null;
  }

  async function upsertThreadChat(input: SlackThreadChat): Promise<SlackThreadChat> {
    await ensureBrainSchema(pool);
    await pool.query(
      `INSERT INTO brain_slack_thread_chat (
         slack_team_id, slack_channel_id, slack_thread_ts, chat_id, user_id, workspace_id
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slack_team_id, slack_channel_id, slack_thread_ts)
       DO UPDATE SET chat_id = EXCLUDED.chat_id, user_id = EXCLUDED.user_id,
                     workspace_id = EXCLUDED.workspace_id`,
      [
        input.slackTeamId,
        input.slackChannelId,
        input.slackThreadTs,
        input.chatId,
        input.userId,
        input.workspaceId,
      ],
    );
    return input;
  }

  return {
    upsertIdentity,
    lookupBySlackUser,
    deleteIdentity,
    latestIdentityForUser,
    getThreadChat,
    upsertThreadChat,
  };
}

export type ResolveSlackInboundUserInput = {
  readonly slackTeamId: string;
  readonly slackUserId: string;
  readonly email?: string | null;
  readonly findUsersByEmail?: (email: string) => Promise<readonly BrainEmailUser[]>;
};

export async function resolveSlackInboundUser(
  pool: Pool,
  input: ResolveSlackInboundUserInput,
): Promise<SlackIdentity | null> {
  const store = createSlackInboundStore(pool);
  const byId = await store.lookupBySlackUser(input.slackTeamId, input.slackUserId);
  if (byId) {
    return byId;
  }

  const email = input.email?.trim();
  if (!email) {
    return null;
  }

  const findUsers =
    input.findUsersByEmail ?? ((value: string) => defaultFindUsersByEmail(pool, value));
  const matches = await findUsers(email);
  if (matches.length !== 1) {
    return null;
  }

  const userId = matches[0]?.id;
  if (!userId) {
    return null;
  }

  const latest = await store.latestIdentityForUser(userId);
  const workspaces = createWorkspaceStore(pool);
  let workspaceId = latest?.workspaceId ?? null;
  if (!workspaceId) {
    try {
      workspaceId = (await workspaces.resolveActiveWorkspace(userId)).id;
    } catch {
      return null;
    }
  }

  const mapped: SlackIdentity = {
    userId,
    workspaceId,
    slackTeamId: input.slackTeamId.trim(),
    slackUserId: input.slackUserId.trim(),
  };
  try {
    return await store.upsertIdentity(mapped);
  } catch {
    return null;
  }
}

export function getSlackInboundStore(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  return createSlackInboundStore(getPool(env));
}
