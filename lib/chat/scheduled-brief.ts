import path from "node:path";
import { z } from "zod";
import { getUserDataStore } from "@/lib/chat/user-data/sqlite-user-data-store";

export const SCHEDULED_BRIEF_FILENAME = "scheduled-brief.json";
export const DEFAULT_SCHEDULED_BRIEF_HOUR = 9;
export const DEFAULT_SCHEDULED_BRIEF_MINUTE = 0;
export const DEFAULT_SCHEDULED_BRIEF_TIMEZONE = "UTC";
export const SCHEDULED_BRIEF_STALE_RUN_MS = 15 * 60_000;

const scheduleSchema = z
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
  .strict()
  .transform((value) => {
    const channel = value.slackChannel?.trim() || null;
    return {
      enabled: value.enabled,
      hour: value.hour,
      minute: value.minute,
      timezone: value.timezone,
      weekdaysOnly: value.weekdaysOnly,
      slackDeliveryEnabled: value.slackDeliveryEnabled ?? false,
      slackChannel: channel,
      lastSlackError: value.lastSlackError ?? null,
      lastRunDateKey: value.lastRunDateKey,
      lastChatId: value.lastChatId,
      lastRunAt: value.lastRunAt,
      runningSince: value.runningSince,
    };
  });

export type ScheduledBriefConfig = z.infer<typeof scheduleSchema>;

export type ScheduledBriefUpdate = {
  readonly enabled?: boolean;
  readonly hour?: number;
  readonly minute?: number;
  readonly timezone?: string;
  readonly weekdaysOnly?: boolean;
  readonly slackDeliveryEnabled?: boolean;
  readonly slackChannel?: string | null;
};

export function defaultScheduledBriefConfig(): ScheduledBriefConfig {
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

export function resolveScheduledBriefPath(
  cwd: string = process.cwd(),
  env: Record<string, string | undefined> = process.env,
): string {
  // Legacy host JSON path (one-time migrate into SQLite). Prefer SQLite APIs.
  const configured = env["BRAIN_SCHEDULED_BRIEF_PATH"]?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(cwd, configured);
  }
  return path.resolve(cwd, ".eve", SCHEDULED_BRIEF_FILENAME);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function parseScheduledBriefConfig(value: unknown): ScheduledBriefConfig | null {
  const parsed = scheduleSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }
  if (!isValidTimeZone(parsed.data.timezone)) {
    return null;
  }
  return parsed.data;
}

function partValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string | undefined {
  return parts.find((part) => part.type === type)?.value;
}

export function localDateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = partValue(parts, "year");
  const month = partValue(parts, "month");
  const day = partValue(parts, "day");
  if (!year || !month || !day) {
    throw new Error(`Unable to format date in timezone ${timeZone}`);
  }
  return `${year}-${month}-${day}`;
}

export function localTimeParts(
  date: Date,
  timeZone: string,
): { readonly hour: number; readonly minute: number; readonly weekday: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const hourRaw = partValue(parts, "hour");
  const minuteRaw = partValue(parts, "minute");
  const weekday = partValue(parts, "weekday");
  if (hourRaw === undefined || minuteRaw === undefined || !weekday) {
    throw new Error(`Unable to format time in timezone ${timeZone}`);
  }
  return {
    hour: Number.parseInt(hourRaw, 10),
    minute: Number.parseInt(minuteRaw, 10),
    weekday,
  };
}

const WEEKDAY_SHORT = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);

export type DailyScheduleTiming = {
  readonly enabled: boolean;
  readonly hour: number;
  readonly minute: number;
  readonly timezone: string;
  readonly weekdaysOnly: boolean;
  readonly lastRunDateKey: string | null;
};

export function isDailyScheduleDue(config: DailyScheduleTiming, now: Date = new Date()): boolean {
  if (!config.enabled) {
    return false;
  }

  const dateKey = localDateKey(now, config.timezone);
  if (config.lastRunDateKey === dateKey) {
    return false;
  }

  const local = localTimeParts(now, config.timezone);
  if (local.hour !== config.hour || local.minute !== config.minute) {
    return false;
  }

  if (config.weekdaysOnly && !WEEKDAY_SHORT.has(local.weekday)) {
    return false;
  }

  return true;
}

export function isScheduledBriefDue(config: ScheduledBriefConfig, now: Date = new Date()): boolean {
  return isDailyScheduleDue(config, now);
}

export function isScheduleRunLocked(
  runningSince: string | null,
  now: Date = new Date(),
  staleMs: number = SCHEDULED_BRIEF_STALE_RUN_MS,
): boolean {
  if (!runningSince) {
    return false;
  }
  const started = Date.parse(runningSince);
  if (!Number.isFinite(started)) {
    return false;
  }
  return now.getTime() - started < staleMs;
}

export function isScheduledBriefRunning(
  config: ScheduledBriefConfig,
  now: Date = new Date(),
): boolean {
  return isScheduleRunLocked(config.runningSince, now);
}

export function morningBriefChatTitle(date: Date, timeZone: string): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  return `Morning brief — ${formatted}`;
}

export async function readScheduledBriefConfig(userId: string): Promise<ScheduledBriefConfig> {
  const store = getUserDataStore();
  const config = store.getMorningBrief(userId);
  // Drop locks left behind by crashed / interrupted runs once they go stale.
  if (config.runningSince && !isScheduleRunLocked(config.runningSince)) {
    const cleared = { ...config, runningSince: null };
    return store.replaceMorningBrief(userId, cleared);
  }
  return config;
}

export async function listScheduledBriefConfigs(): Promise<
  readonly (ScheduledBriefConfig & { readonly userId: string })[]
> {
  return getUserDataStore().listMorningBriefs();
}

export async function writeScheduledBriefConfig(
  userId: string,
  update: ScheduledBriefUpdate,
): Promise<ScheduledBriefConfig> {
  return getUserDataStore().updateMorningBrief(userId, update);
}

export async function replaceScheduledBriefConfig(
  userId: string,
  config: ScheduledBriefConfig,
): Promise<ScheduledBriefConfig> {
  const parsed = parseScheduledBriefConfig(config);
  if (!parsed) {
    throw new Error("Invalid schedule configuration.");
  }
  return getUserDataStore().replaceMorningBrief(userId, parsed);
}

export const updateScheduledBriefBodySchema = z
  .object({
    enabled: z.boolean().optional(),
    hour: z.number().int().min(0).max(23).optional(),
    minute: z.number().int().min(0).max(59).optional(),
    timezone: z.string().min(1).optional(),
    weekdaysOnly: z.boolean().optional(),
    slackDeliveryEnabled: z.boolean().optional(),
    slackChannel: z.string().nullable().optional(),
  })
  .strict();

export const runScheduledBriefBodySchema = z
  .object({
    force: z.boolean().optional(),
    source: z.enum(["schedule", "ui", "cron", "api"]).optional(),
  })
  .strict();
