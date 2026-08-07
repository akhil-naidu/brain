import { existsSync, readFileSync, renameSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { MAX_PLAYBOOK_LABEL_CHARS, MAX_PLAYBOOK_PROMPT_CHARS } from "@/lib/chat/playbooks";
import { MAX_SCHEDULED_PLAYBOOKS } from "@/lib/chat/scheduled-playbooks-limits";
import type {
  ScheduledBriefConfig,
  UserDataStore,
} from "@/lib/chat/user-data/postgres-user-data-store";

export const SCHEDULED_PLAYBOOKS_FILENAME = "scheduled-playbooks.json";
export const SCHEDULED_BRIEF_FILENAME = "scheduled-brief.json";

const scheduleItemSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1).max(MAX_PLAYBOOK_LABEL_CHARS),
    prompt: z.string().min(1).max(MAX_PLAYBOOK_PROMPT_CHARS),
    sourcePlaybookId: z.string().nullable(),
    enabled: z.boolean(),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    timezone: z.string().min(1),
    weekdaysOnly: z.boolean(),
    slackDeliveryEnabled: z.boolean(),
    slackChannel: z.string().nullable(),
    lastSlackError: z.string().nullable(),
    lastRunDateKey: z.string().nullable(),
    lastChatId: z.string().nullable(),
    lastRunAt: z.string().nullable(),
    runningSince: z.string().nullable(),
  })
  .strict();

const playbooksStoreSchema = z
  .object({
    schedules: z.array(scheduleItemSchema).max(MAX_SCHEDULED_PLAYBOOKS),
  })
  .strict();

const briefSchema = z
  .object({
    enabled: z.boolean(),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    timezone: z.string().min(1),
    weekdaysOnly: z.boolean(),
    slackDeliveryEnabled: z.boolean().optional(),
    slackChannel: z.string().nullable().optional(),
    lastSlackError: z.string().nullable().optional(),
    lastRunDateKey: z.string().nullable(),
    lastChatId: z.string().nullable(),
    lastRunAt: z.string().nullable(),
    runningSince: z.string().nullable(),
  })
  .strict();

export function resolveScheduledPlaybooksPath(
  cwd: string = process.cwd(),
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = env["BRAIN_SCHEDULED_PLAYBOOKS_PATH"]?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(cwd, configured);
  }
  return path.resolve(cwd, ".eve", SCHEDULED_PLAYBOOKS_FILENAME);
}

export function resolveLegacyScheduledBriefPath(
  cwd: string = process.cwd(),
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = env["BRAIN_SCHEDULED_BRIEF_PATH"]?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(cwd, configured);
  }
  return path.resolve(cwd, ".eve", SCHEDULED_BRIEF_FILENAME);
}

function readJsonFile(filePath: string): unknown {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function renameMigrated(filePath: string): void {
  if (!existsSync(filePath)) return;
  renameSync(filePath, `${filePath}.migrated`);
}

function parseBriefConfig(value: unknown): ScheduledBriefConfig | null {
  const parsed = briefSchema.safeParse(value);
  if (!parsed.success) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: parsed.data.timezone }).format(new Date());
  } catch {
    return null;
  }
  const channel = parsed.data.slackChannel?.trim() || null;
  return {
    enabled: parsed.data.enabled,
    hour: parsed.data.hour,
    minute: parsed.data.minute,
    timezone: parsed.data.timezone,
    weekdaysOnly: parsed.data.weekdaysOnly,
    slackDeliveryEnabled: parsed.data.slackDeliveryEnabled ?? false,
    slackChannel: channel,
    lastSlackError: parsed.data.lastSlackError ?? null,
    lastRunDateKey: parsed.data.lastRunDateKey,
    lastChatId: parsed.data.lastChatId,
    lastRunAt: parsed.data.lastRunAt,
    runningSince: parsed.data.runningSince,
  };
}

/**
 * One-time import of host-wide `.eve/scheduled-*.json` into the operator/first user
 * when schedule tables are empty. Renames source files to `*.migrated`.
 */
export async function migrateHostSchedulesIntoStore(
  store: UserDataStore,
  env: Record<string, string | undefined> = process.env,
  cwd: string = process.cwd(),
): Promise<{ readonly importedPlaybooks: number; readonly importedBrief: boolean }> {
  if (
    (await store.listAllPlaybookSchedules()).length > 0 ||
    (await store.listMorningBriefs()).length > 0
  ) {
    return { importedPlaybooks: 0, importedBrief: false };
  }

  // Host JSON migrate targets an explicit operator id only (no first-user fallback).
  const userId = env["BRAIN_OPERATOR_USER_ID"]?.trim();
  if (!userId) {
    return { importedPlaybooks: 0, importedBrief: false };
  }
  // Scope key equals operator user id; first login remaps onto Personal workspace UUID.
  const workspaceId = userId;

  const playbooksPath = resolveScheduledPlaybooksPath(cwd, env);
  const briefPath = resolveLegacyScheduledBriefPath(cwd, env);
  const playbooksExist = existsSync(playbooksPath);
  const briefExists = existsSync(briefPath);
  if (!playbooksExist && !briefExists) {
    return { importedPlaybooks: 0, importedBrief: false };
  }

  let importedPlaybooks = 0;
  if (playbooksExist) {
    const raw = readJsonFile(playbooksPath);
    const parsed = playbooksStoreSchema.safeParse(raw);
    if (parsed.success) {
      await Promise.all(
        parsed.data.schedules.map((schedule) =>
          store.replacePlaybookSchedule(workspaceId, userId, schedule),
        ),
      );
      importedPlaybooks = parsed.data.schedules.length;
      renameMigrated(playbooksPath);
    }
  }

  let importedBrief = false;
  if (briefExists) {
    const brief = parseBriefConfig(readJsonFile(briefPath));
    if (brief) {
      await store.replaceMorningBrief(workspaceId, userId, brief);
      importedBrief = true;
      renameMigrated(briefPath);
    }
  }

  return { importedPlaybooks, importedBrief };
}
