import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { z } from "zod";

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
    lastRunDateKey: z.string().nullable(),
    lastChatId: z.string().nullable(),
    lastRunAt: z.string().nullable(),
    runningSince: z.string().nullable(),
  })
  .strict();

export type ScheduledBriefConfig = z.infer<typeof scheduleSchema>;

export type ScheduledBriefUpdate = {
  readonly enabled?: boolean;
  readonly hour?: number;
  readonly minute?: number;
  readonly timezone?: string;
  readonly weekdaysOnly?: boolean;
};

export function defaultScheduledBriefConfig(): ScheduledBriefConfig {
  return {
    enabled: false,
    hour: DEFAULT_SCHEDULED_BRIEF_HOUR,
    minute: DEFAULT_SCHEDULED_BRIEF_MINUTE,
    timezone: DEFAULT_SCHEDULED_BRIEF_TIMEZONE,
    weekdaysOnly: true,
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

export function isScheduledBriefDue(config: ScheduledBriefConfig, now: Date = new Date()): boolean {
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

export function isScheduledBriefRunning(
  config: ScheduledBriefConfig,
  now: Date = new Date(),
): boolean {
  if (!config.runningSince) {
    return false;
  }
  const started = Date.parse(config.runningSince);
  if (!Number.isFinite(started)) {
    return false;
  }
  return now.getTime() - started < SCHEDULED_BRIEF_STALE_RUN_MS;
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

export function hostCronExample(
  config: ScheduledBriefConfig,
  origin = "http://localhost:3000",
): string {
  const minute = String(config.minute);
  const hour = String(config.hour);
  const dow = config.weekdaysOnly ? "1-5" : "*";
  const url = `${origin.replace(/\/$/, "")}/api/briefs/run`;
  return `${minute} ${hour} * * ${dow} curl -fsS -X POST ${url} -H 'content-type: application/json' -d '{"force":true}'`;
}

export async function readScheduledBriefConfig(
  filePath: string = resolveScheduledBriefPath(),
): Promise<ScheduledBriefConfig> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = parseScheduledBriefConfig(JSON.parse(raw) as unknown);
    return parsed ?? defaultScheduledBriefConfig();
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code === "ENOENT"
    ) {
      return defaultScheduledBriefConfig();
    }
    return defaultScheduledBriefConfig();
  }
}

async function writeScheduledBriefConfigAtomic(
  filePath: string,
  config: ScheduledBriefConfig,
): Promise<void> {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
  );
  try {
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(config, null, 2)}\n`, "utf8");
    } finally {
      await handle.close();
    }
    await rename(temporary, filePath);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function writeScheduledBriefConfig(
  update: ScheduledBriefUpdate,
  filePath: string = resolveScheduledBriefPath(),
): Promise<ScheduledBriefConfig> {
  const current = await readScheduledBriefConfig(filePath);
  const next: ScheduledBriefConfig = {
    ...current,
    ...update,
  };

  if (!isValidTimeZone(next.timezone)) {
    throw new Error("Invalid timezone.");
  }
  if (!Number.isInteger(next.hour) || next.hour < 0 || next.hour > 23) {
    throw new Error("Hour must be an integer from 0 to 23.");
  }
  if (!Number.isInteger(next.minute) || next.minute < 0 || next.minute > 59) {
    throw new Error("Minute must be an integer from 0 to 59.");
  }

  const parsed = parseScheduledBriefConfig(next);
  if (!parsed) {
    throw new Error("Invalid schedule configuration.");
  }

  await writeScheduledBriefConfigAtomic(filePath, parsed);
  return parsed;
}

export async function replaceScheduledBriefConfig(
  config: ScheduledBriefConfig,
  filePath: string = resolveScheduledBriefPath(),
): Promise<ScheduledBriefConfig> {
  const parsed = parseScheduledBriefConfig(config);
  if (!parsed) {
    throw new Error("Invalid schedule configuration.");
  }
  await writeScheduledBriefConfigAtomic(filePath, parsed);
  return parsed;
}

export const updateScheduledBriefBodySchema = z
  .object({
    enabled: z.boolean().optional(),
    hour: z.number().int().min(0).max(23).optional(),
    minute: z.number().int().min(0).max(59).optional(),
    timezone: z.string().min(1).optional(),
    weekdaysOnly: z.boolean().optional(),
  })
  .strict();

export const runScheduledBriefBodySchema = z
  .object({
    force: z.boolean().optional(),
    source: z.enum(["schedule", "ui", "cron", "api"]).optional(),
  })
  .strict();
