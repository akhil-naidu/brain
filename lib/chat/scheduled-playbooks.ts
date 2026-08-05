import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  DEFAULT_SCHEDULED_BRIEF_HOUR,
  DEFAULT_SCHEDULED_BRIEF_MINUTE,
  DEFAULT_SCHEDULED_BRIEF_TIMEZONE,
  isDailyScheduleDue,
  isScheduleRunLocked,
  isValidTimeZone,
  localDateKey,
} from "@/lib/chat/scheduled-brief";
import {
  MAX_PLAYBOOK_LABEL_CHARS,
  MAX_PLAYBOOK_PROMPT_CHARS,
  normalizePlaybookLabel,
  normalizePlaybookPrompt,
} from "@/lib/chat/playbooks";

export const SCHEDULED_PLAYBOOKS_FILENAME = "scheduled-playbooks.json";
export const MAX_SCHEDULED_PLAYBOOKS = 6;

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

const storeSchema = z
  .object({
    schedules: z.array(scheduleItemSchema).max(MAX_SCHEDULED_PLAYBOOKS),
  })
  .strict();

export type ScheduledPlaybook = z.infer<typeof scheduleItemSchema>;

export type ScheduledPlaybookCreate = {
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

export type ScheduledPlaybookUpdate = {
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

export function scheduledPlaybookChatTitle(label: string, date: Date, timeZone: string): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  return `${label} — ${formatted}`;
}

export async function readScheduledPlaybooks(
  filePath: string = resolveScheduledPlaybooksPath(),
): Promise<readonly ScheduledPlaybook[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = storeSchema.safeParse(JSON.parse(raw) as unknown);
    if (!parsed.success) {
      return [];
    }
    return parsed.data.schedules;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    return [];
  }
}

async function writeScheduledPlaybooksAtomic(
  schedules: readonly ScheduledPlaybook[],
  filePath: string,
): Promise<void> {
  const parsed = storeSchema.parse({ schedules });
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
  );
  try {
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(parsed, null, 2)}\n`, "utf8");
    } finally {
      await handle.close();
    }
    await rename(temporary, filePath);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

function normalizeChannel(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function createScheduledPlaybook(
  input: ScheduledPlaybookCreate,
  filePath: string = resolveScheduledPlaybooksPath(),
): Promise<ScheduledPlaybook> {
  const current = await readScheduledPlaybooks(filePath);
  if (current.length >= MAX_SCHEDULED_PLAYBOOKS) {
    throw new Error(`You can schedule up to ${MAX_SCHEDULED_PLAYBOOKS} playbooks.`);
  }

  const label = normalizePlaybookLabel(input.label);
  const prompt = normalizePlaybookPrompt(input.prompt);
  if (!label) {
    throw new Error("Name is required.");
  }
  if (!prompt) {
    throw new Error("Prompt is required.");
  }

  const timezone = input.timezone?.trim() || DEFAULT_SCHEDULED_BRIEF_TIMEZONE;
  if (!isValidTimeZone(timezone)) {
    throw new Error("Invalid timezone.");
  }

  const schedule: ScheduledPlaybook = {
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

  const parsed = scheduleItemSchema.parse(schedule);
  await writeScheduledPlaybooksAtomic([...current, parsed], filePath);
  return parsed;
}

export async function updateScheduledPlaybook(
  id: string,
  update: ScheduledPlaybookUpdate,
  filePath: string = resolveScheduledPlaybooksPath(),
): Promise<ScheduledPlaybook> {
  const current = await readScheduledPlaybooks(filePath);
  const existing = current.find((item) => item.id === id);
  if (!existing) {
    throw new Error("Schedule not found.");
  }

  const next: ScheduledPlaybook = {
    ...existing,
    ...(update.label !== undefined ? { label: normalizePlaybookLabel(update.label) } : {}),
    ...(update.prompt !== undefined ? { prompt: normalizePlaybookPrompt(update.prompt) } : {}),
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

  if (!next.label) {
    throw new Error("Name is required.");
  }
  if (!next.prompt) {
    throw new Error("Prompt is required.");
  }
  if (!isValidTimeZone(next.timezone)) {
    throw new Error("Invalid timezone.");
  }

  const parsed = scheduleItemSchema.parse(next);
  await writeScheduledPlaybooksAtomic(
    current.map((item) => (item.id === id ? parsed : item)),
    filePath,
  );
  return parsed;
}

export async function deleteScheduledPlaybook(
  id: string,
  filePath: string = resolveScheduledPlaybooksPath(),
): Promise<boolean> {
  const current = await readScheduledPlaybooks(filePath);
  const next = current.filter((item) => item.id !== id);
  if (next.length === current.length) {
    return false;
  }
  await writeScheduledPlaybooksAtomic(next, filePath);
  return true;
}

export async function replaceScheduledPlaybook(
  schedule: ScheduledPlaybook,
  filePath: string = resolveScheduledPlaybooksPath(),
): Promise<ScheduledPlaybook> {
  const parsed = scheduleItemSchema.parse(schedule);
  const current = await readScheduledPlaybooks(filePath);
  const index = current.findIndex((item) => item.id === parsed.id);
  if (index < 0) {
    throw new Error("Schedule not found.");
  }
  const next = [...current];
  next[index] = parsed;
  await writeScheduledPlaybooksAtomic(next, filePath);
  return parsed;
}

export function isScheduledPlaybookDue(
  schedule: ScheduledPlaybook,
  now: Date = new Date(),
): boolean {
  return isDailyScheduleDue(schedule, now);
}

export function isScheduledPlaybookRunning(
  schedule: ScheduledPlaybook,
  now: Date = new Date(),
): boolean {
  return isScheduleRunLocked(schedule.runningSince, now);
}

export function markPlaybookScheduleCompleted(
  schedule: ScheduledPlaybook,
  input: {
    readonly chatId: string;
    readonly completedAt?: Date;
    readonly slackError?: string | null;
  },
): ScheduledPlaybook {
  const completedAt = input.completedAt ?? new Date();
  return {
    ...schedule,
    runningSince: null,
    lastRunAt: completedAt.toISOString(),
    lastRunDateKey: localDateKey(completedAt, schedule.timezone),
    lastChatId: input.chatId,
    lastSlackError: input.slackError ?? null,
  };
}

export const createScheduledPlaybookBodySchema = z
  .object({
    label: z.string().min(1),
    prompt: z.string().min(1),
    sourcePlaybookId: z.string().nullable().optional(),
    enabled: z.boolean().optional(),
    hour: z.number().int().min(0).max(23).optional(),
    minute: z.number().int().min(0).max(59).optional(),
    timezone: z.string().min(1).optional(),
    weekdaysOnly: z.boolean().optional(),
    slackDeliveryEnabled: z.boolean().optional(),
    slackChannel: z.string().nullable().optional(),
  })
  .strict();

export const updateScheduledPlaybookBodySchema = z
  .object({
    label: z.string().min(1).optional(),
    prompt: z.string().min(1).optional(),
    enabled: z.boolean().optional(),
    hour: z.number().int().min(0).max(23).optional(),
    minute: z.number().int().min(0).max(59).optional(),
    timezone: z.string().min(1).optional(),
    weekdaysOnly: z.boolean().optional(),
    slackDeliveryEnabled: z.boolean().optional(),
    slackChannel: z.string().nullable().optional(),
  })
  .strict();

export const runScheduledPlaybookBodySchema = z
  .object({
    id: z.string().min(1).optional(),
    force: z.boolean().optional(),
    source: z.enum(["schedule", "ui", "cron", "api"]).optional(),
  })
  .strict();
