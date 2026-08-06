import { z } from "zod";
import { MAX_SCHEDULED_PLAYBOOKS } from "@/lib/chat/scheduled-playbooks-limits";
import type { ChatRecord } from "@/lib/chat/store/types";
import { parseSessionState, parseStreamEvent, sessionStateSchema } from "@/lib/chat/store/parse";

export { MAX_SCHEDULED_PLAYBOOKS };

const scheduleSchema = z.object({
  id: z.string(),
  label: z.string(),
  prompt: z.string(),
  sourcePlaybookId: z.string().nullable(),
  enabled: z.boolean(),
  hour: z.number(),
  minute: z.number(),
  timezone: z.string(),
  weekdaysOnly: z.boolean(),
  slackDeliveryEnabled: z.boolean(),
  slackChannel: z.string().nullable(),
  lastSlackError: z.string().nullable(),
  lastRunDateKey: z.string().nullable(),
  lastChatId: z.string().nullable(),
  lastRunAt: z.string().nullable(),
  runningSince: z.string().nullable(),
});

export type ScheduledPlaybook = z.infer<typeof scheduleSchema>;

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

const chatRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  visibility: z.enum(["personal", "shared"]).default("personal"),
  userId: z.string().default(""),
  revision: z.number().int().nonnegative().default(0),
  workspaceId: z.string().optional(),
  eveSession: sessionStateSchema.nullable(),
  events: z.array(z.unknown()),
});

const slackResultSchema = z.union([
  z.object({ attempted: z.literal(false) }),
  z.object({
    attempted: z.literal(true),
    ok: z.literal(true),
    channelId: z.string(),
  }),
  z.object({
    attempted: z.literal(true),
    ok: z.literal(false),
    error: z.string(),
  }),
]);

function toChatRecord(value: unknown): ChatRecord {
  const parsed = chatRecordSchema.parse(value);
  return {
    id: parsed.id,
    title: parsed.title,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
    visibility: parsed.visibility,
    userId: parsed.userId,
    revision: parsed.revision,
    workspaceId: parsed.workspaceId ?? "",
    eveSession: parsed.eveSession === null ? null : parseSessionState(parsed.eveSession),
    events: parsed.events.map(parseStreamEvent),
  };
}

async function readBody(response: Response): Promise<unknown> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed (${response.status})`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export async function listScheduledPlaybooks(): Promise<readonly ScheduledPlaybook[]> {
  const response = await fetch("/api/playbook-schedules", { cache: "no-store" });
  const data = await readBody(response);
  return z.object({ schedules: z.array(scheduleSchema) }).parse(data).schedules;
}

export async function createScheduledPlaybookApi(
  input: ScheduledPlaybookCreate,
): Promise<ScheduledPlaybook> {
  const response = await fetch("/api/playbook-schedules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readBody(response);
  return z.object({ schedule: scheduleSchema }).parse(data).schedule;
}

export async function updateScheduledPlaybookApi(
  id: string,
  update: ScheduledPlaybookUpdate,
): Promise<ScheduledPlaybook> {
  const response = await fetch(`/api/playbook-schedules/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  const data = await readBody(response);
  return z.object({ schedule: scheduleSchema }).parse(data).schedule;
}

export async function deleteScheduledPlaybookApi(id: string): Promise<void> {
  const response = await fetch(`/api/playbook-schedules/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await readBody(response);
}

export type RunPlaybookScheduleResult =
  | {
      readonly skipped: false;
      readonly chat: ChatRecord;
      readonly schedule: ScheduledPlaybook;
      readonly slack: z.infer<typeof slackResultSchema>;
    }
  | {
      readonly skipped: true;
      readonly reason: "not_found" | "disabled" | "not_due" | "already_running";
    };

export async function runScheduledPlaybookNow(id: string): Promise<RunPlaybookScheduleResult> {
  const response = await fetch("/api/playbook-schedules/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, force: true, source: "ui" }),
  });
  const data = await readBody(response);
  const parsed = z
    .object({
      ok: z.literal(true),
      skipped: z.boolean(),
      reason: z.enum(["not_found", "disabled", "not_due", "already_running"]).optional(),
      chat: z.unknown().optional(),
      schedule: scheduleSchema.optional(),
      slack: slackResultSchema.optional(),
    })
    .parse(data);

  if (parsed.skipped) {
    return { skipped: true, reason: parsed.reason ?? "not_due" };
  }

  return {
    skipped: false,
    chat: toChatRecord(parsed.chat),
    schedule: scheduleSchema.parse(parsed.schedule),
    slack: parsed.slack ?? { attempted: false },
  };
}
