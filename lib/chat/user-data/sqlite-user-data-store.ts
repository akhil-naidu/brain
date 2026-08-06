import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  MAX_PLAYBOOKS,
  MAX_PLAYBOOK_LABEL_CHARS,
  MAX_PLAYBOOK_PROMPT_CHARS,
  normalizePlaybookLabel,
  normalizePlaybookPrompt,
  type Playbook,
} from "@/lib/chat/playbooks";
import { MAX_SCHEDULED_PLAYBOOKS } from "@/lib/chat/scheduled-playbooks-limits";
import { resolveChatsDbPath } from "@/lib/chat/store/path";
import { migrateHostSchedulesIntoStore } from "@/lib/chat/user-data/migrate-host-schedules";

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

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

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

type SqlRow = Record<string, null | number | bigint | string | Uint8Array>;

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

function requireBool(row: SqlRow, key: string): boolean {
  return requireNumber(row, key) !== 0;
}

function normalizeChannel(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toPlaybook(row: SqlRow): Playbook {
  return {
    id: requireString(row, "id"),
    label: requireString(row, "label"),
    prompt: requireString(row, "prompt"),
    updatedAt: requireNumber(row, "updated_at"),
  };
}

function toScheduledPlaybook(
  row: SqlRow,
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
  row: SqlRow,
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

export type UserDataStore = {
  listPlaybooks(workspaceId: string): readonly Playbook[];
  upsertPlaybook(
    workspaceId: string,
    createdBy: string,
    input: { readonly id?: string; readonly label: string; readonly prompt: string },
  ): Playbook;
  deletePlaybook(workspaceId: string, id: string): boolean;
  importPlaybooks(
    workspaceId: string,
    createdBy: string,
    playbooks: readonly Playbook[],
  ): readonly Playbook[];

  listPlaybookSchedules(workspaceId: string): readonly StoredScheduledPlaybook[];
  listAllPlaybookSchedules(): readonly (StoredScheduledPlaybook & {
    readonly workspaceId: string;
    readonly runAsUserId: string;
  })[];
  getPlaybookSchedule(id: string):
    | (StoredScheduledPlaybook & {
        readonly workspaceId: string;
        readonly runAsUserId: string;
      })
    | null;
  createPlaybookSchedule(
    workspaceId: string,
    runAsUserId: string,
    input: StoredScheduledPlaybookCreate,
  ): StoredScheduledPlaybook;
  updatePlaybookSchedule(
    workspaceId: string,
    id: string,
    update: StoredScheduledPlaybookUpdate,
  ): StoredScheduledPlaybook;
  deletePlaybookSchedule(workspaceId: string, id: string): boolean;
  replacePlaybookSchedule(
    workspaceId: string,
    runAsUserId: string,
    schedule: StoredScheduledPlaybook,
  ): StoredScheduledPlaybook;
  /**
   * Atomically claim a schedule run by setting `runningSince` only when unlocked
   * or stale (`running_since` null or <= staleBefore). Returns null if another
   * runner already holds a fresh lock.
   */
  tryClaimPlaybookScheduleRun(
    workspaceId: string,
    id: string,
    claim: { readonly runningSince: string; readonly staleBefore: string },
  ):
    | (StoredScheduledPlaybook & {
        readonly workspaceId: string;
        readonly runAsUserId: string;
      })
    | null;

  getMorningBrief(workspaceId: string, runAsUserId: string): ScheduledBriefConfig;
  listMorningBriefs(): readonly (ScheduledBriefConfig & {
    readonly workspaceId: string;
    readonly runAsUserId: string;
  })[];
  updateMorningBrief(
    workspaceId: string,
    runAsUserId: string,
    update: ScheduledBriefUpdate,
  ): ScheduledBriefConfig;
  replaceMorningBrief(
    workspaceId: string,
    runAsUserId: string,
    config: ScheduledBriefConfig,
  ): ScheduledBriefConfig;
  tryClaimMorningBriefRun(
    workspaceId: string,
    runAsUserId: string,
    claim: { readonly runningSince: string; readonly staleBefore: string },
  ): ScheduledBriefConfig | null;

  migrateUserScopedDataToWorkspace(userId: string, workspaceId: string): void;

  close(): void;
};

function countFromRow(row: unknown): number {
  if (!row || typeof row !== "object" || !("count" in row)) {
    return 0;
  }
  const value: unknown = Reflect.get(row, "count");
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  return 0;
}

function requireRow(value: unknown): SqlRow {
  if (!value || typeof value !== "object") {
    throw new Error("Expected sqlite row");
  }
  const row: SqlRow = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      continue;
    }
    const entry: unknown = Reflect.get(value, key);
    if (
      entry === null ||
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "bigint" ||
      entry instanceof Uint8Array
    ) {
      row[key] = entry;
    }
  }
  return row;
}

export function createSqliteUserDataStore(dbPath: string): UserDataStore {
  if (dbPath !== ":memory:") {
    mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS playbook (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      workspace_id TEXT,
      label TEXT NOT NULL,
      prompt TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS playbook_user_updated_idx ON playbook(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS playbook_workspace_updated_idx ON playbook(workspace_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS playbook_schedule (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      workspace_id TEXT,
      run_as_user_id TEXT,
      label TEXT NOT NULL,
      prompt TEXT NOT NULL,
      source_playbook_id TEXT,
      enabled INTEGER NOT NULL,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      timezone TEXT NOT NULL,
      weekdays_only INTEGER NOT NULL,
      slack_delivery_enabled INTEGER NOT NULL,
      slack_channel TEXT,
      last_slack_error TEXT,
      last_run_date_key TEXT,
      last_chat_id TEXT,
      last_run_at TEXT,
      running_since TEXT
    );
    CREATE INDEX IF NOT EXISTS playbook_schedule_user_idx ON playbook_schedule(user_id);
    CREATE INDEX IF NOT EXISTS playbook_schedule_workspace_idx ON playbook_schedule(workspace_id);

    CREATE TABLE IF NOT EXISTS morning_brief_schedule (
      user_id TEXT PRIMARY KEY NOT NULL,
      workspace_id TEXT,
      run_as_user_id TEXT,
      enabled INTEGER NOT NULL,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      timezone TEXT NOT NULL,
      weekdays_only INTEGER NOT NULL,
      slack_delivery_enabled INTEGER NOT NULL,
      slack_channel TEXT,
      last_slack_error TEXT,
      last_run_date_key TEXT,
      last_chat_id TEXT,
      last_run_at TEXT,
      running_since TEXT
    );
    CREATE INDEX IF NOT EXISTS morning_brief_schedule_workspace_idx ON morning_brief_schedule(workspace_id);
  `);

  const listPlaybooksStmt = db.prepare(
    "SELECT * FROM playbook WHERE workspace_id = ? ORDER BY updated_at DESC",
  );
  const findPlaybookStmt = db.prepare("SELECT * FROM playbook WHERE workspace_id = ? AND id = ?");
  const countPlaybooksStmt = db.prepare(
    "SELECT COUNT(*) AS count FROM playbook WHERE workspace_id = ?",
  );
  const insertPlaybookStmt = db.prepare(
    "INSERT INTO playbook (id, user_id, workspace_id, label, prompt, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const updatePlaybookStmt = db.prepare(
    "UPDATE playbook SET label = ?, prompt = ?, updated_at = ? WHERE workspace_id = ? AND id = ?",
  );
  const deletePlaybookStmt = db.prepare("DELETE FROM playbook WHERE workspace_id = ? AND id = ?");

  const listSchedulesForUserStmt = db.prepare(
    "SELECT * FROM playbook_schedule WHERE workspace_id = ? ORDER BY label ASC",
  );
  const listAllSchedulesStmt = db.prepare("SELECT * FROM playbook_schedule");
  const findScheduleStmt = db.prepare("SELECT * FROM playbook_schedule WHERE id = ?");
  const findScheduleForUserStmt = db.prepare(
    "SELECT * FROM playbook_schedule WHERE workspace_id = ? AND id = ?",
  );
  const countSchedulesStmt = db.prepare(
    "SELECT COUNT(*) AS count FROM playbook_schedule WHERE workspace_id = ?",
  );
  const insertScheduleStmt = db.prepare(`
    INSERT INTO playbook_schedule (
      id, user_id, workspace_id, run_as_user_id, label, prompt, source_playbook_id, enabled, hour, minute, timezone,
      weekdays_only, slack_delivery_enabled, slack_channel, last_slack_error,
      last_run_date_key, last_chat_id, last_run_at, running_since
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateScheduleStmt = db.prepare(`
    UPDATE playbook_schedule SET
      label = ?, prompt = ?, source_playbook_id = ?, enabled = ?, hour = ?, minute = ?,
      timezone = ?, weekdays_only = ?, slack_delivery_enabled = ?, slack_channel = ?,
      last_slack_error = ?, last_run_date_key = ?, last_chat_id = ?, last_run_at = ?,
      running_since = ?
    WHERE workspace_id = ? AND id = ?
  `);
  const deleteScheduleStmt = db.prepare(
    "DELETE FROM playbook_schedule WHERE workspace_id = ? AND id = ?",
  );
  const claimScheduleRunStmt = db.prepare(`
    UPDATE playbook_schedule
    SET running_since = ?
    WHERE workspace_id = ? AND id = ?
      AND (running_since IS NULL OR running_since <= ?)
  `);

  const getBriefStmt = db.prepare(
    "SELECT * FROM morning_brief_schedule WHERE workspace_id = ? AND run_as_user_id = ?",
  );
  const listBriefsStmt = db.prepare("SELECT * FROM morning_brief_schedule");
  const ensureBriefRowStmt = db.prepare(`
    INSERT INTO morning_brief_schedule (
      user_id, workspace_id, run_as_user_id, enabled, hour, minute, timezone, weekdays_only, slack_delivery_enabled,
      slack_channel, last_slack_error, last_run_date_key, last_chat_id, last_run_at, running_since
    ) VALUES (?, ?, ?, 0, ?, ?, ?, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL)
    ON CONFLICT(user_id) DO NOTHING
  `);
  const claimBriefRunStmt = db.prepare(`
    UPDATE morning_brief_schedule
    SET running_since = ?
    WHERE workspace_id = ? AND run_as_user_id = ?
      AND (running_since IS NULL OR running_since <= ?)
  `);
  const upsertBriefStmt = db.prepare(`
    INSERT INTO morning_brief_schedule (
      user_id, workspace_id, run_as_user_id, enabled, hour, minute, timezone, weekdays_only, slack_delivery_enabled,
      slack_channel, last_slack_error, last_run_date_key, last_chat_id, last_run_at, running_since
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      workspace_id = excluded.workspace_id,
      run_as_user_id = excluded.run_as_user_id,
      enabled = excluded.enabled,
      hour = excluded.hour,
      minute = excluded.minute,
      timezone = excluded.timezone,
      weekdays_only = excluded.weekdays_only,
      slack_delivery_enabled = excluded.slack_delivery_enabled,
      slack_channel = excluded.slack_channel,
      last_slack_error = excluded.last_slack_error,
      last_run_date_key = excluded.last_run_date_key,
      last_chat_id = excluded.last_chat_id,
      last_run_at = excluded.last_run_at,
      running_since = excluded.running_since
  `);

  const migratePlaybooksStmt = db.prepare(
    `UPDATE playbook SET workspace_id = ?
     WHERE user_id = ? AND (workspace_id IS NULL OR workspace_id = '' OR workspace_id = user_id)`,
  );
  const migratePlaybookSchedulesStmt = db.prepare(
    `UPDATE playbook_schedule
     SET workspace_id = ?, run_as_user_id = COALESCE(run_as_user_id, user_id)
     WHERE user_id = ? AND (workspace_id IS NULL OR workspace_id = '' OR workspace_id = user_id)`,
  );
  const migrateMorningBriefStmt = db.prepare(
    `UPDATE morning_brief_schedule
     SET workspace_id = ?, run_as_user_id = COALESCE(run_as_user_id, user_id)
     WHERE user_id = ? AND (workspace_id IS NULL OR workspace_id = '' OR workspace_id = user_id)`,
  );

  function writeScheduleRow(
    workspaceId: string,
    _runAsUserId: string,
    schedule: StoredScheduledPlaybook,
  ) {
    updateScheduleStmt.run(
      schedule.label,
      schedule.prompt,
      schedule.sourcePlaybookId,
      schedule.enabled ? 1 : 0,
      schedule.hour,
      schedule.minute,
      schedule.timezone,
      schedule.weekdaysOnly ? 1 : 0,
      schedule.slackDeliveryEnabled ? 1 : 0,
      schedule.slackChannel,
      schedule.lastSlackError,
      schedule.lastRunDateKey,
      schedule.lastChatId,
      schedule.lastRunAt,
      schedule.runningSince,
      workspaceId,
      schedule.id,
    );
  }

  function writeBriefRow(workspaceId: string, runAsUserId: string, config: ScheduledBriefConfig) {
    upsertBriefStmt.run(
      runAsUserId,
      workspaceId,
      runAsUserId,
      config.enabled ? 1 : 0,
      config.hour,
      config.minute,
      config.timezone,
      config.weekdaysOnly ? 1 : 0,
      config.slackDeliveryEnabled ? 1 : 0,
      config.slackChannel,
      config.lastSlackError,
      config.lastRunDateKey,
      config.lastChatId,
      config.lastRunAt,
      config.runningSince,
    );
  }

  return {
    listPlaybooks(workspaceId) {
      return listPlaybooksStmt.all(workspaceId).map((row) => toPlaybook(requireRow(row)));
    },

    upsertPlaybook(workspaceId, createdBy, input) {
      const label = normalizePlaybookLabel(input.label);
      const prompt = normalizePlaybookPrompt(input.prompt);
      if (!label) throw new Error("Name is required.");
      if (!prompt) throw new Error("Prompt is required.");
      if (label.length > MAX_PLAYBOOK_LABEL_CHARS || prompt.length > MAX_PLAYBOOK_PROMPT_CHARS) {
        throw new Error("Playbook exceeds size limits.");
      }
      const now = Date.now();
      if (input.id) {
        const existing = findPlaybookStmt.get(workspaceId, input.id);
        if (!existing) throw new Error("Playbook not found.");
        updatePlaybookStmt.run(label, prompt, now, workspaceId, input.id);
        return toPlaybook(requireRow(findPlaybookStmt.get(workspaceId, input.id)));
      }
      if (countFromRow(countPlaybooksStmt.get(workspaceId)) >= MAX_PLAYBOOKS) {
        throw new Error(`You can save up to ${MAX_PLAYBOOKS} playbooks.`);
      }
      const id = randomUUID();
      insertPlaybookStmt.run(id, createdBy, workspaceId, label, prompt, now);
      return toPlaybook(requireRow(findPlaybookStmt.get(workspaceId, id)));
    },

    deletePlaybook(workspaceId, id) {
      const result = deletePlaybookStmt.run(workspaceId, id);
      return Number(result.changes ?? 0) > 0;
    },

    importPlaybooks(workspaceId, createdBy, playbooks) {
      const existing = this.listPlaybooks(workspaceId);
      if (existing.length > 0) {
        return existing;
      }
      const limited = playbooks.slice(0, MAX_PLAYBOOKS);
      for (const item of limited) {
        const label = normalizePlaybookLabel(item.label);
        const prompt = normalizePlaybookPrompt(item.prompt);
        if (!label || !prompt) continue;
        insertPlaybookStmt.run(
          item.id || randomUUID(),
          createdBy,
          workspaceId,
          label,
          prompt,
          item.updatedAt,
        );
      }
      return this.listPlaybooks(workspaceId);
    },

    listPlaybookSchedules(workspaceId) {
      return listSchedulesForUserStmt.all(workspaceId).map((row) => {
        const full = toScheduledPlaybook(requireRow(row));
        const { workspaceId: _workspaceId, runAsUserId: _runAsUserId, ...schedule } = full;
        return schedule;
      });
    },

    listAllPlaybookSchedules() {
      return listAllSchedulesStmt.all().map((row) => toScheduledPlaybook(requireRow(row)));
    },

    getPlaybookSchedule(id) {
      const row = findScheduleStmt.get(id);
      return row ? toScheduledPlaybook(requireRow(row)) : null;
    },

    createPlaybookSchedule(workspaceId, runAsUserId, input) {
      if (countFromRow(countSchedulesStmt.get(workspaceId)) >= MAX_SCHEDULED_PLAYBOOKS) {
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
      insertScheduleStmt.run(
        schedule.id,
        runAsUserId,
        workspaceId,
        runAsUserId,
        schedule.label,
        schedule.prompt,
        schedule.sourcePlaybookId,
        schedule.enabled ? 1 : 0,
        schedule.hour,
        schedule.minute,
        schedule.timezone,
        schedule.weekdaysOnly ? 1 : 0,
        schedule.slackDeliveryEnabled ? 1 : 0,
        schedule.slackChannel,
        schedule.lastSlackError,
        schedule.lastRunDateKey,
        schedule.lastChatId,
        schedule.lastRunAt,
        schedule.runningSince,
      );
      return schedule;
    },

    updatePlaybookSchedule(workspaceId, id, update) {
      const existing = findScheduleForUserStmt.get(workspaceId, id);
      if (!existing) throw new Error("Schedule not found.");
      const current = toScheduledPlaybook(requireRow(existing));
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
      writeScheduleRow(workspaceId, current.runAsUserId, next);
      return next;
    },

    deletePlaybookSchedule(workspaceId, id) {
      const result = deleteScheduleStmt.run(workspaceId, id);
      return Number(result.changes ?? 0) > 0;
    },

    replacePlaybookSchedule(workspaceId, runAsUserId, schedule) {
      const existing = findScheduleForUserStmt.get(workspaceId, schedule.id);
      if (existing) {
        const existingParsed = toScheduledPlaybook(requireRow(existing));
        writeScheduleRow(workspaceId, existingParsed.runAsUserId, schedule);
        return schedule;
      }
      if (countFromRow(countSchedulesStmt.get(workspaceId)) >= MAX_SCHEDULED_PLAYBOOKS) {
        throw new Error(`You can schedule up to ${MAX_SCHEDULED_PLAYBOOKS} playbooks.`);
      }
      insertScheduleStmt.run(
        schedule.id,
        runAsUserId,
        workspaceId,
        runAsUserId,
        schedule.label,
        schedule.prompt,
        schedule.sourcePlaybookId,
        schedule.enabled ? 1 : 0,
        schedule.hour,
        schedule.minute,
        schedule.timezone,
        schedule.weekdaysOnly ? 1 : 0,
        schedule.slackDeliveryEnabled ? 1 : 0,
        schedule.slackChannel,
        schedule.lastSlackError,
        schedule.lastRunDateKey,
        schedule.lastChatId,
        schedule.lastRunAt,
        schedule.runningSince,
      );
      return schedule;
    },

    tryClaimPlaybookScheduleRun(workspaceId, id, claim) {
      const result = claimScheduleRunStmt.run(
        claim.runningSince,
        workspaceId,
        id,
        claim.staleBefore,
      );
      if (Number(result.changes ?? 0) === 0) {
        return null;
      }
      const row = findScheduleForUserStmt.get(workspaceId, id);
      return row ? toScheduledPlaybook(requireRow(row)) : null;
    },

    getMorningBrief(workspaceId, runAsUserId) {
      const row = getBriefStmt.get(workspaceId, runAsUserId);
      if (!row) {
        return defaultScheduledBriefConfig();
      }
      const {
        workspaceId: _workspaceId,
        runAsUserId: _runAsUserId,
        ...config
      } = toMorningBrief(requireRow(row));
      return config;
    },

    listMorningBriefs() {
      return listBriefsStmt.all().map((row) => toMorningBrief(requireRow(row)));
    },

    updateMorningBrief(workspaceId, runAsUserId, update) {
      const current = this.getMorningBrief(workspaceId, runAsUserId);
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
      writeBriefRow(workspaceId, runAsUserId, next);
      return next;
    },

    replaceMorningBrief(workspaceId, runAsUserId, config) {
      writeBriefRow(workspaceId, runAsUserId, config);
      return config;
    },

    tryClaimMorningBriefRun(workspaceId, runAsUserId, claim) {
      const defaults = defaultScheduledBriefConfig();
      ensureBriefRowStmt.run(
        runAsUserId,
        workspaceId,
        runAsUserId,
        defaults.hour,
        defaults.minute,
        defaults.timezone,
      );
      const result = claimBriefRunStmt.run(
        claim.runningSince,
        workspaceId,
        runAsUserId,
        claim.staleBefore,
      );
      if (Number(result.changes ?? 0) === 0) {
        return null;
      }
      return this.getMorningBrief(workspaceId, runAsUserId);
    },

    migrateUserScopedDataToWorkspace(userId, workspaceId) {
      migratePlaybooksStmt.run(workspaceId, userId);
      migratePlaybookSchedulesStmt.run(workspaceId, userId);
      migrateMorningBriefStmt.run(workspaceId, userId);
    },

    close() {
      db.close();
    },
  };
}

const globalForUserData = globalThis as typeof globalThis & {
  brainUserDataStore?: UserDataStore;
  brainUserDataStorePath?: string;
};

export function getUserDataStore(): UserDataStore {
  const dbPath = resolveChatsDbPath();
  if (
    !globalForUserData.brainUserDataStore ||
    globalForUserData.brainUserDataStorePath !== dbPath
  ) {
    globalForUserData.brainUserDataStore?.close();
    globalForUserData.brainUserDataStore = createSqliteUserDataStore(dbPath);
    globalForUserData.brainUserDataStorePath = dbPath;
  }
  // Retry until operator exists / files are gone — store may open before bootstrap.
  migrateHostSchedulesIntoStore(globalForUserData.brainUserDataStore);
  return globalForUserData.brainUserDataStore;
}

export function resetUserDataStoreForTests(): void {
  globalForUserData.brainUserDataStore?.close();
  delete globalForUserData.brainUserDataStore;
  delete globalForUserData.brainUserDataStorePath;
}
