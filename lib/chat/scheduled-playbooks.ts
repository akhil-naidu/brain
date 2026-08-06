import { z } from "zod";
import {
  DEFAULT_SCHEDULED_BRIEF_HOUR,
  DEFAULT_SCHEDULED_BRIEF_MINUTE,
  DEFAULT_SCHEDULED_BRIEF_TIMEZONE,
  isDailyScheduleDue,
  isScheduleRunLocked,
  localDateKey,
} from "@/lib/chat/scheduled-brief";
import { MAX_PLAYBOOK_LABEL_CHARS, MAX_PLAYBOOK_PROMPT_CHARS } from "@/lib/chat/playbooks";
import { MAX_SCHEDULED_PLAYBOOKS } from "@/lib/chat/scheduled-playbooks-limits";
import {
  resolveScheduledPlaybooksPath,
  SCHEDULED_PLAYBOOKS_FILENAME,
} from "@/lib/chat/user-data/migrate-host-schedules";
import { getUserDataStore } from "@/lib/chat/user-data/sqlite-user-data-store";

export { MAX_SCHEDULED_PLAYBOOKS, resolveScheduledPlaybooksPath, SCHEDULED_PLAYBOOKS_FILENAME };

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
  userId: string,
): Promise<readonly ScheduledPlaybook[]> {
  return getUserDataStore().listPlaybookSchedules(userId);
}

export async function listAllScheduledPlaybooks(): Promise<
  readonly (ScheduledPlaybook & { readonly userId: string })[]
> {
  return getUserDataStore().listAllPlaybookSchedules();
}

export async function createScheduledPlaybook(
  userId: string,
  input: ScheduledPlaybookCreate,
): Promise<ScheduledPlaybook> {
  return getUserDataStore().createPlaybookSchedule(userId, input);
}

export async function updateScheduledPlaybook(
  userId: string,
  id: string,
  update: ScheduledPlaybookUpdate,
): Promise<ScheduledPlaybook> {
  return getUserDataStore().updatePlaybookSchedule(userId, id, update);
}

export async function deleteScheduledPlaybook(userId: string, id: string): Promise<boolean> {
  return getUserDataStore().deletePlaybookSchedule(userId, id);
}

export async function replaceScheduledPlaybook(
  userId: string,
  schedule: ScheduledPlaybook,
): Promise<ScheduledPlaybook> {
  const parsed = scheduleItemSchema.parse(schedule);
  return getUserDataStore().replacePlaybookSchedule(userId, parsed);
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

// Keep defaults re-exported for callers that imported via this module historically.
export {
  DEFAULT_SCHEDULED_BRIEF_HOUR,
  DEFAULT_SCHEDULED_BRIEF_MINUTE,
  DEFAULT_SCHEDULED_BRIEF_TIMEZONE,
};
