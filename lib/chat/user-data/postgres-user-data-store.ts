import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import {
  MAX_PLAYBOOKS,
  MAX_PLAYBOOK_LABEL_CHARS,
  MAX_PLAYBOOK_PROMPT_CHARS,
  normalizePlaybookLabel,
  normalizePlaybookPrompt,
  type Playbook,
} from "@/lib/chat/playbooks";
import { MAX_SCHEDULED_PLAYBOOKS } from "@/lib/chat/scheduled-playbooks-limits";
import { getPool } from "@/lib/db/pool";
import { countFromDbRow } from "@/lib/db/rows";

const DEFAULT_SCHEDULED_BRIEF_HOUR = 9;
const DEFAULT_SCHEDULED_BRIEF_MINUTE = 0;
const DEFAULT_SCHEDULED_BRIEF_TIMEZONE = "UTC";

export type ScheduledBriefConfig = {
  readonly enabled: boolean;
  readonly hour: number;
  readonly minute: number;
  readonly timezone: string;
  readonly weekdaysOnly: boolean;
  readonly slackDeliveryEnabled: boolean;
  readonly slackChannel: string | null;
  readonly lastSlackError: string | null;
  readonly lastRunDateKey: string | null;
  readonly lastChatId: string | null;
  readonly lastRunAt: string | null;
  readonly runningSince: string | null;
};

export type ScheduledBriefUpdate = {
  readonly enabled?: boolean;
  readonly hour?: number;
  readonly minute?: number;
  readonly timezone?: string;
  readonly weekdaysOnly?: boolean;
  readonly slackDeliveryEnabled?: boolean;
  readonly slackChannel?: string | null;
};

export type StoredScheduledPlaybook = {
  readonly id: string;
  readonly label: string;
  readonly prompt: string;
  readonly sourcePlaybookId: string | null;
  readonly enabled: boolean;
  readonly hour: number;
  readonly minute: number;
  readonly timezone: string;
  readonly weekdaysOnly: boolean;
  readonly slackDeliveryEnabled: boolean;
  readonly slackChannel: string | null;
  readonly lastSlackError: string | null;
  readonly lastRunDateKey: string | null;
  readonly lastChatId: string | null;
  readonly lastRunAt: string | null;
  readonly runningSince: string | null;
};

export type StoredScheduledPlaybookCreate = {
  readonly label: string;
  readonly prompt: string;
  readonly sourcePlaybookId?: string | null;
  readonly enabled?: boolean;
  readonly hour?: number;
  readonly minute?: number;
  readonly timezone?: string;
  readonly weekdaysOnly?: boolean;
  readonly slackDeliveryEnabled?: boolean;
  readonly slackChannel?: string | null;
};

export type StoredScheduledPlaybookUpdate = {
  readonly label?: string;
  readonly prompt?: string;
  readonly enabled?: boolean;
  readonly hour?: number;
  readonly minute?: number;
  readonly timezone?: string;
  readonly weekdaysOnly?: boolean;
  readonly slackDeliveryEnabled?: boolean;
  readonly slackChannel?: string | null;
};

export type UserDataStore = {
  listPlaybooks(workspaceId: string): Promise<readonly Playbook[]>;
  upsertPlaybook(
    workspaceId: string,
    createdBy: string,
    input: { readonly id?: string; readonly label: string; readonly prompt: string },
  ): Promise<Playbook>;
  deletePlaybook(workspaceId: string, id: string): Promise<boolean>;
  importPlaybooks(
    workspaceId: string,
    createdBy: string,
    playbooks: readonly Playbook[],
  ): Promise<readonly Playbook[]>;

  listPlaybookSchedules(workspaceId: string): Promise<readonly StoredScheduledPlaybook[]>;
  listAllPlaybookSchedules(): Promise<
    readonly (StoredScheduledPlaybook & {
      readonly workspaceId: string;
      readonly runAsUserId: string;
    })[]
  >;
  getPlaybookSchedule(id: string): Promise<
    | (StoredScheduledPlaybook & {
        readonly workspaceId: string;
        readonly runAsUserId: string;
      })
    | null
  >;
  createPlaybookSchedule(
    workspaceId: string,
    runAsUserId: string,
    input: StoredScheduledPlaybookCreate,
  ): Promise<StoredScheduledPlaybook>;
  updatePlaybookSchedule(
    workspaceId: string,
    id: string,
    update: StoredScheduledPlaybookUpdate,
  ): Promise<StoredScheduledPlaybook>;
  deletePlaybookSchedule(workspaceId: string, id: string): Promise<boolean>;
  replacePlaybookSchedule(
    workspaceId: string,
    runAsUserId: string,
    schedule: StoredScheduledPlaybook,
  ): Promise<StoredScheduledPlaybook>;
  /**
   * Atomically claim a schedule run by setting `running_since` only when unlocked
   * or stale (`running_since` null or <= staleBefore). Returns null if another
   * runner already holds a fresh lock.
   */
  tryClaimPlaybookScheduleRun(
    workspaceId: string,
    id: string,
    claim: { readonly runningSince: string; readonly staleBefore: string },
  ): Promise<
    | (StoredScheduledPlaybook & {
        readonly workspaceId: string;
        readonly runAsUserId: string;
      })
    | null
  >;

  getMorningBrief(workspaceId: string, runAsUserId: string): Promise<ScheduledBriefConfig>;
  listMorningBriefs(): Promise<
    readonly (ScheduledBriefConfig & {
      readonly workspaceId: string;
      readonly runAsUserId: string;
    })[]
  >;
  updateMorningBrief(
    workspaceId: string,
    runAsUserId: string,
    update: ScheduledBriefUpdate,
  ): Promise<ScheduledBriefConfig>;
  replaceMorningBrief(
    workspaceId: string,
    runAsUserId: string,
    config: ScheduledBriefConfig,
  ): Promise<ScheduledBriefConfig>;
  tryClaimMorningBriefRun(
    workspaceId: string,
    runAsUserId: string,
    claim: { readonly runningSince: string; readonly staleBefore: string },
  ): Promise<ScheduledBriefConfig | null>;

  migrateUserScopedDataToWorkspace(userId: string, workspaceId: string): Promise<void>;

  close(): Promise<void>;
};

// ---------------------------------------------------------------------------
// Row helpers
// ---------------------------------------------------------------------------

type PgRow = Record<string, unknown>;

function requireString(row: PgRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected string column ${key}, got ${typeof value}`);
  }
  return value;
}

function optionalString(row: PgRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new Error(`Expected string or null column ${key}`);
  }
  return value;
}

function requireNumber(row: PgRow, key: string): number {
  const value = row[key];
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  // pg returns BIGINT as string
  if (typeof value === "string") {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  throw new Error(`Expected numeric column ${key}, got ${typeof value}`);
}

function requireBool(row: PgRow, key: string): boolean {
  const value = row[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "true" || value === "1";
  throw new Error(`Expected boolean column ${key}, got ${typeof value}`);
}

function normalizeChannel(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function toPlaybook(row: PgRow): Playbook {
  return {
    id: requireString(row, "id"),
    label: requireString(row, "label"),
    prompt: requireString(row, "prompt"),
    updatedAt: requireNumber(row, "updated_at"),
  };
}

function toScheduledPlaybook(
  row: PgRow,
): StoredScheduledPlaybook & { readonly workspaceId: string; readonly runAsUserId: string } {
  return {
    workspaceId: requireString(row, "workspace_id"),
    runAsUserId: requireString(row, "run_as_user_id"),
    id: requireString(row, "id"),
    label: requireString(row, "label"),
    prompt: requireString(row, "prompt"),
    sourcePlaybookId: optionalString(row, "source_playbook_id"),
    enabled: requireBool(row, "enabled"),
    hour: requireNumber(row, "hour"),
    minute: requireNumber(row, "minute"),
    timezone: requireString(row, "timezone"),
    weekdaysOnly: requireBool(row, "weekdays_only"),
    slackDeliveryEnabled: requireBool(row, "slack_delivery_enabled"),
    slackChannel: optionalString(row, "slack_channel"),
    lastSlackError: optionalString(row, "last_slack_error"),
    lastRunDateKey: optionalString(row, "last_run_date_key"),
    lastChatId: optionalString(row, "last_chat_id"),
    lastRunAt: optionalString(row, "last_run_at"),
    runningSince: optionalString(row, "running_since"),
  };
}

function toMorningBrief(
  row: PgRow,
): ScheduledBriefConfig & { readonly workspaceId: string; readonly runAsUserId: string } {
  return {
    workspaceId: requireString(row, "workspace_id"),
    runAsUserId: requireString(row, "run_as_user_id"),
    enabled: requireBool(row, "enabled"),
    hour: requireNumber(row, "hour"),
    minute: requireNumber(row, "minute"),
    timezone: requireString(row, "timezone"),
    weekdaysOnly: requireBool(row, "weekdays_only"),
    slackDeliveryEnabled: requireBool(row, "slack_delivery_enabled"),
    slackChannel: optionalString(row, "slack_channel"),
    lastSlackError: optionalString(row, "last_slack_error"),
    lastRunDateKey: optionalString(row, "last_run_date_key"),
    lastChatId: optionalString(row, "last_chat_id"),
    lastRunAt: optionalString(row, "last_run_at"),
    runningSince: optionalString(row, "running_since"),
  };
}

function defaultScheduledBriefConfig(): ScheduledBriefConfig {
  return {
    enabled: false,
    hour: DEFAULT_SCHEDULED_BRIEF_HOUR,
    minute: DEFAULT_SCHEDULED_BRIEF_MINUTE,
    timezone: DEFAULT_SCHEDULED_BRIEF_TIMEZONE,
    weekdaysOnly: true,
    slackDeliveryEnabled: false,
    slackChannel: null,
    lastSlackError: null,
    lastRunDateKey: null,
    lastChatId: null,
    lastRunAt: null,
    runningSince: null,
  };
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

export function createPostgresUserDataStore(pool: Pool): UserDataStore {
  return {
    async listPlaybooks(workspaceId) {
      const result = await pool.query<PgRow>(
        "SELECT * FROM playbook WHERE workspace_id = $1 ORDER BY updated_at DESC",
        [workspaceId],
      );
      return result.rows.map(toPlaybook);
    },

    async upsertPlaybook(workspaceId, createdBy, input) {
      const label = normalizePlaybookLabel(input.label);
      const prompt = normalizePlaybookPrompt(input.prompt);
      if (!label) throw new Error("Name is required.");
      if (!prompt) throw new Error("Prompt is required.");
      if (label.length > MAX_PLAYBOOK_LABEL_CHARS || prompt.length > MAX_PLAYBOOK_PROMPT_CHARS) {
        throw new Error("Playbook exceeds size limits.");
      }
      const now = Date.now();
      if (input.id) {
        const existing = await pool.query(
          "SELECT id FROM playbook WHERE workspace_id = $1 AND id = $2",
          [workspaceId, input.id],
        );
        if (existing.rowCount === 0) throw new Error("Playbook not found.");
        await pool.query(
          "UPDATE playbook SET label = $1, prompt = $2, updated_at = $3 WHERE workspace_id = $4 AND id = $5",
          [label, prompt, now, workspaceId, input.id],
        );
        const updated = await pool.query<PgRow>(
          "SELECT * FROM playbook WHERE workspace_id = $1 AND id = $2",
          [workspaceId, input.id],
        );
        const updatedRow = updated.rows[0];
        if (!updatedRow) throw new Error("Playbook missing after update.");
        return toPlaybook(updatedRow);
      }
      const countResult = await pool.query<PgRow>(
        "SELECT COUNT(*) AS count FROM playbook WHERE workspace_id = $1",
        [workspaceId],
      );
      const count = countFromDbRow(countResult.rows[0]);
      if (count >= MAX_PLAYBOOKS) {
        throw new Error(`You can save up to ${MAX_PLAYBOOKS} playbooks.`);
      }
      const id = randomUUID();
      await pool.query(
        "INSERT INTO playbook (id, user_id, workspace_id, label, prompt, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
        [id, createdBy, workspaceId, label, prompt, now],
      );
      const inserted = await pool.query<PgRow>(
        "SELECT * FROM playbook WHERE workspace_id = $1 AND id = $2",
        [workspaceId, id],
      );
      const insertedRow = inserted.rows[0];
      if (!insertedRow) throw new Error("Playbook missing after insert.");
      return toPlaybook(insertedRow);
    },

    async deletePlaybook(workspaceId, id) {
      const result = await pool.query("DELETE FROM playbook WHERE workspace_id = $1 AND id = $2", [
        workspaceId,
        id,
      ]);
      return (result.rowCount ?? 0) > 0;
    },

    async importPlaybooks(workspaceId, createdBy, playbooks) {
      const existing = await this.listPlaybooks(workspaceId);
      if (existing.length > 0) return existing;
      const limited = playbooks.slice(0, MAX_PLAYBOOKS);
      await Promise.all(
        limited.map((item) => {
          const label = normalizePlaybookLabel(item.label);
          const prompt = normalizePlaybookPrompt(item.prompt);
          if (!label || !prompt) return Promise.resolve();
          return pool.query(
            "INSERT INTO playbook (id, user_id, workspace_id, label, prompt, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING",
            [item.id || randomUUID(), createdBy, workspaceId, label, prompt, item.updatedAt],
          );
        }),
      );
      return this.listPlaybooks(workspaceId);
    },

    async listPlaybookSchedules(workspaceId) {
      const result = await pool.query<PgRow>(
        "SELECT * FROM playbook_schedule WHERE workspace_id = $1 ORDER BY label ASC",
        [workspaceId],
      );
      return result.rows.map((row) => {
        const full = toScheduledPlaybook(row);
        const { workspaceId: _w, runAsUserId: _r, ...schedule } = full;
        return schedule;
      });
    },

    async listAllPlaybookSchedules() {
      const result = await pool.query<PgRow>("SELECT * FROM playbook_schedule");
      return result.rows.map(toScheduledPlaybook);
    },

    async getPlaybookSchedule(id) {
      const result = await pool.query<PgRow>("SELECT * FROM playbook_schedule WHERE id = $1", [id]);
      const row = result.rows[0];
      return row ? toScheduledPlaybook(row) : null;
    },

    async createPlaybookSchedule(workspaceId, runAsUserId, input) {
      const countResult = await pool.query<PgRow>(
        "SELECT COUNT(*) AS count FROM playbook_schedule WHERE workspace_id = $1",
        [workspaceId],
      );
      const count = countFromDbRow(countResult.rows[0]);
      if (count >= MAX_SCHEDULED_PLAYBOOKS) {
        throw new Error(`You can schedule up to ${MAX_SCHEDULED_PLAYBOOKS} playbooks.`);
      }
      const label = normalizePlaybookLabel(input.label);
      const prompt = normalizePlaybookPrompt(input.prompt);
      if (!label) throw new Error("Name is required.");
      if (!prompt) throw new Error("Prompt is required.");
      const timezone = input.timezone?.trim() || DEFAULT_SCHEDULED_BRIEF_TIMEZONE;
      if (!isValidTimeZone(timezone)) throw new Error("Invalid timezone.");
      const schedule: StoredScheduledPlaybook = {
        id: randomUUID(),
        label,
        prompt,
        sourcePlaybookId: input.sourcePlaybookId?.trim() || null,
        enabled: input.enabled ?? true,
        hour: input.hour ?? DEFAULT_SCHEDULED_BRIEF_HOUR,
        minute: input.minute ?? DEFAULT_SCHEDULED_BRIEF_MINUTE,
        timezone,
        weekdaysOnly: input.weekdaysOnly ?? true,
        slackDeliveryEnabled: input.slackDeliveryEnabled ?? false,
        slackChannel: normalizeChannel(input.slackChannel),
        lastSlackError: null,
        lastRunDateKey: null,
        lastChatId: null,
        lastRunAt: null,
        runningSince: null,
      };
      await pool.query(
        `INSERT INTO playbook_schedule (
          id, user_id, workspace_id, run_as_user_id, label, prompt, source_playbook_id, enabled, hour, minute, timezone,
          weekdays_only, slack_delivery_enabled, slack_channel, last_slack_error,
          last_run_date_key, last_chat_id, last_run_at, running_since
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          schedule.id,
          runAsUserId,
          workspaceId,
          runAsUserId,
          schedule.label,
          schedule.prompt,
          schedule.sourcePlaybookId,
          schedule.enabled,
          schedule.hour,
          schedule.minute,
          schedule.timezone,
          schedule.weekdaysOnly,
          schedule.slackDeliveryEnabled,
          schedule.slackChannel,
          schedule.lastSlackError,
          schedule.lastRunDateKey,
          schedule.lastChatId,
          schedule.lastRunAt,
          schedule.runningSince,
        ],
      );
      return schedule;
    },

    async updatePlaybookSchedule(workspaceId, id, update) {
      const existing = await pool.query<PgRow>(
        "SELECT * FROM playbook_schedule WHERE workspace_id = $1 AND id = $2",
        [workspaceId, id],
      );
      const existingRow = existing.rows[0];
      if (!existingRow) throw new Error("Schedule not found.");
      const current = toScheduledPlaybook(existingRow);
      const next: StoredScheduledPlaybook = {
        id: current.id,
        label: update.label !== undefined ? normalizePlaybookLabel(update.label) : current.label,
        prompt:
          update.prompt !== undefined ? normalizePlaybookPrompt(update.prompt) : current.prompt,
        sourcePlaybookId: current.sourcePlaybookId,
        enabled: update.enabled ?? current.enabled,
        hour: update.hour ?? current.hour,
        minute: update.minute ?? current.minute,
        timezone: update.timezone !== undefined ? update.timezone.trim() : current.timezone,
        weekdaysOnly: update.weekdaysOnly ?? current.weekdaysOnly,
        slackDeliveryEnabled: update.slackDeliveryEnabled ?? current.slackDeliveryEnabled,
        slackChannel:
          update.slackChannel !== undefined
            ? normalizeChannel(update.slackChannel)
            : current.slackChannel,
        lastSlackError: current.lastSlackError,
        lastRunDateKey: current.lastRunDateKey,
        lastChatId: current.lastChatId,
        lastRunAt: current.lastRunAt,
        runningSince: current.runningSince,
      };
      if (!next.label) throw new Error("Name is required.");
      if (!next.prompt) throw new Error("Prompt is required.");
      if (!isValidTimeZone(next.timezone)) throw new Error("Invalid timezone.");
      await pool.query(
        `UPDATE playbook_schedule SET
          label = $1, prompt = $2, source_playbook_id = $3, enabled = $4, hour = $5, minute = $6,
          timezone = $7, weekdays_only = $8, slack_delivery_enabled = $9, slack_channel = $10,
          last_slack_error = $11, last_run_date_key = $12, last_chat_id = $13, last_run_at = $14,
          running_since = $15
        WHERE workspace_id = $16 AND id = $17`,
        [
          next.label,
          next.prompt,
          next.sourcePlaybookId,
          next.enabled,
          next.hour,
          next.minute,
          next.timezone,
          next.weekdaysOnly,
          next.slackDeliveryEnabled,
          next.slackChannel,
          next.lastSlackError,
          next.lastRunDateKey,
          next.lastChatId,
          next.lastRunAt,
          next.runningSince,
          workspaceId,
          id,
        ],
      );
      return next;
    },

    async deletePlaybookSchedule(workspaceId, id) {
      const result = await pool.query(
        "DELETE FROM playbook_schedule WHERE workspace_id = $1 AND id = $2",
        [workspaceId, id],
      );
      return (result.rowCount ?? 0) > 0;
    },

    async replacePlaybookSchedule(workspaceId, runAsUserId, schedule) {
      const existing = await pool.query(
        "SELECT run_as_user_id FROM playbook_schedule WHERE workspace_id = $1 AND id = $2",
        [workspaceId, schedule.id],
      );
      if ((existing.rowCount ?? 0) > 0) {
        await pool.query(
          `UPDATE playbook_schedule SET
            label = $1, prompt = $2, source_playbook_id = $3, enabled = $4, hour = $5, minute = $6,
            timezone = $7, weekdays_only = $8, slack_delivery_enabled = $9, slack_channel = $10,
            last_slack_error = $11, last_run_date_key = $12, last_chat_id = $13, last_run_at = $14,
            running_since = $15
          WHERE workspace_id = $16 AND id = $17`,
          [
            schedule.label,
            schedule.prompt,
            schedule.sourcePlaybookId,
            schedule.enabled,
            schedule.hour,
            schedule.minute,
            schedule.timezone,
            schedule.weekdaysOnly,
            schedule.slackDeliveryEnabled,
            schedule.slackChannel,
            schedule.lastSlackError,
            schedule.lastRunDateKey,
            schedule.lastChatId,
            schedule.lastRunAt,
            schedule.runningSince,
            workspaceId,
            schedule.id,
          ],
        );
        return schedule;
      }
      const countResult = await pool.query<PgRow>(
        "SELECT COUNT(*) AS count FROM playbook_schedule WHERE workspace_id = $1",
        [workspaceId],
      );
      const count = countFromDbRow(countResult.rows[0]);
      if (count >= MAX_SCHEDULED_PLAYBOOKS) {
        throw new Error(`You can schedule up to ${MAX_SCHEDULED_PLAYBOOKS} playbooks.`);
      }
      await pool.query(
        `INSERT INTO playbook_schedule (
          id, user_id, workspace_id, run_as_user_id, label, prompt, source_playbook_id, enabled, hour, minute, timezone,
          weekdays_only, slack_delivery_enabled, slack_channel, last_slack_error,
          last_run_date_key, last_chat_id, last_run_at, running_since
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          schedule.id,
          runAsUserId,
          workspaceId,
          runAsUserId,
          schedule.label,
          schedule.prompt,
          schedule.sourcePlaybookId,
          schedule.enabled,
          schedule.hour,
          schedule.minute,
          schedule.timezone,
          schedule.weekdaysOnly,
          schedule.slackDeliveryEnabled,
          schedule.slackChannel,
          schedule.lastSlackError,
          schedule.lastRunDateKey,
          schedule.lastChatId,
          schedule.lastRunAt,
          schedule.runningSince,
        ],
      );
      return schedule;
    },

    async tryClaimPlaybookScheduleRun(workspaceId, id, claim) {
      const result = await pool.query(
        `UPDATE playbook_schedule
         SET running_since = $1
         WHERE workspace_id = $2 AND id = $3
           AND (running_since IS NULL OR running_since <= $4)`,
        [claim.runningSince, workspaceId, id, claim.staleBefore],
      );
      if ((result.rowCount ?? 0) === 0) return null;
      const row = await pool.query<PgRow>(
        "SELECT * FROM playbook_schedule WHERE workspace_id = $1 AND id = $2",
        [workspaceId, id],
      );
      const found = row.rows[0];
      return found ? toScheduledPlaybook(found) : null;
    },

    async getMorningBrief(workspaceId, runAsUserId) {
      const result = await pool.query<PgRow>(
        "SELECT * FROM morning_brief_schedule WHERE workspace_id = $1 AND run_as_user_id = $2",
        [workspaceId, runAsUserId],
      );
      const row = result.rows[0];
      if (!row) return defaultScheduledBriefConfig();
      const { workspaceId: _w, runAsUserId: _r, ...config } = toMorningBrief(row);
      return config;
    },

    async listMorningBriefs() {
      const result = await pool.query<PgRow>("SELECT * FROM morning_brief_schedule");
      return result.rows.map(toMorningBrief);
    },

    async updateMorningBrief(workspaceId, runAsUserId, update) {
      const current = await this.getMorningBrief(workspaceId, runAsUserId);
      const next: ScheduledBriefConfig = {
        ...current,
        ...(update.enabled !== undefined ? { enabled: update.enabled } : {}),
        ...(update.hour !== undefined ? { hour: update.hour } : {}),
        ...(update.minute !== undefined ? { minute: update.minute } : {}),
        ...(update.timezone !== undefined ? { timezone: update.timezone.trim() } : {}),
        ...(update.weekdaysOnly !== undefined ? { weekdaysOnly: update.weekdaysOnly } : {}),
        ...(update.slackDeliveryEnabled !== undefined
          ? { slackDeliveryEnabled: update.slackDeliveryEnabled }
          : {}),
        ...(update.slackChannel !== undefined
          ? { slackChannel: normalizeChannel(update.slackChannel) }
          : {}),
      };
      if (!isValidTimeZone(next.timezone)) throw new Error("Invalid timezone.");
      await this.replaceMorningBrief(workspaceId, runAsUserId, next);
      return next;
    },

    async replaceMorningBrief(workspaceId, runAsUserId, config) {
      await pool.query(
        `INSERT INTO morning_brief_schedule (
          user_id, workspace_id, run_as_user_id, enabled, hour, minute, timezone, weekdays_only, slack_delivery_enabled,
          slack_channel, last_slack_error, last_run_date_key, last_chat_id, last_run_at, running_since
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (user_id) DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          run_as_user_id = EXCLUDED.run_as_user_id,
          enabled = EXCLUDED.enabled,
          hour = EXCLUDED.hour,
          minute = EXCLUDED.minute,
          timezone = EXCLUDED.timezone,
          weekdays_only = EXCLUDED.weekdays_only,
          slack_delivery_enabled = EXCLUDED.slack_delivery_enabled,
          slack_channel = EXCLUDED.slack_channel,
          last_slack_error = EXCLUDED.last_slack_error,
          last_run_date_key = EXCLUDED.last_run_date_key,
          last_chat_id = EXCLUDED.last_chat_id,
          last_run_at = EXCLUDED.last_run_at,
          running_since = EXCLUDED.running_since`,
        [
          runAsUserId,
          workspaceId,
          runAsUserId,
          config.enabled,
          config.hour,
          config.minute,
          config.timezone,
          config.weekdaysOnly,
          config.slackDeliveryEnabled,
          config.slackChannel,
          config.lastSlackError,
          config.lastRunDateKey,
          config.lastChatId,
          config.lastRunAt,
          config.runningSince,
        ],
      );
      return config;
    },

    async tryClaimMorningBriefRun(workspaceId, runAsUserId, claim) {
      const defaults = defaultScheduledBriefConfig();
      // Ensure row exists first
      await pool.query(
        `INSERT INTO morning_brief_schedule (
          user_id, workspace_id, run_as_user_id, enabled, hour, minute, timezone, weekdays_only, slack_delivery_enabled,
          slack_channel, last_slack_error, last_run_date_key, last_chat_id, last_run_at, running_since
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, NULL, NULL, NULL, NULL, NULL)
        ON CONFLICT (user_id) DO NOTHING`,
        [
          runAsUserId,
          workspaceId,
          runAsUserId,
          defaults.enabled,
          defaults.hour,
          defaults.minute,
          defaults.timezone,
          true,
          false,
        ],
      );
      const result = await pool.query(
        `UPDATE morning_brief_schedule
         SET running_since = $1
         WHERE workspace_id = $2 AND run_as_user_id = $3
           AND (running_since IS NULL OR running_since <= $4)`,
        [claim.runningSince, workspaceId, runAsUserId, claim.staleBefore],
      );
      if ((result.rowCount ?? 0) === 0) return null;
      return this.getMorningBrief(workspaceId, runAsUserId);
    },

    async migrateUserScopedDataToWorkspace(userId, workspaceId) {
      await pool.query(
        `UPDATE playbook SET workspace_id = $1
         WHERE user_id = $2 AND (workspace_id IS NULL OR workspace_id = '' OR workspace_id = $2)`,
        [workspaceId, userId],
      );
      await pool.query(
        `UPDATE playbook_schedule
         SET workspace_id = $1, run_as_user_id = COALESCE(run_as_user_id, user_id)
         WHERE user_id = $2 AND (workspace_id IS NULL OR workspace_id = '' OR workspace_id = $2)`,
        [workspaceId, userId],
      );
      await pool.query(
        `UPDATE morning_brief_schedule
         SET workspace_id = $1, run_as_user_id = COALESCE(run_as_user_id, user_id)
         WHERE user_id = $2 AND (workspace_id IS NULL OR workspace_id = '' OR workspace_id = $2)`,
        [workspaceId, userId],
      );
    },

    async close() {
      // Pool is shared globally; no-op here.
    },
  };
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

const globalForUserData = globalThis as typeof globalThis & {
  brainUserDataStore?: UserDataStore;
};

export function getUserDataStore(): UserDataStore {
  if (!globalForUserData.brainUserDataStore) {
    globalForUserData.brainUserDataStore = createPostgresUserDataStore(getPool());
  }
  return globalForUserData.brainUserDataStore;
}

export function resetUserDataStoreForTests(): void {
  delete globalForUserData.brainUserDataStore;
}
