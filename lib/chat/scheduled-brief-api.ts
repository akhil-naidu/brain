import { z } from "zod";
import type { ScheduledBriefConfig, ScheduledBriefUpdate } from "@/lib/chat/scheduled-brief";
import type { ChatRecord } from "@/lib/chat/store/types";
import { parseSessionState, parseStreamEvent, sessionStateSchema } from "@/lib/chat/store/parse";

const scheduleSchema = z.object({
  enabled: z.boolean(),
  hour: z.number(),
  minute: z.number(),
  timezone: z.string(),
  weekdaysOnly: z.boolean(),
  lastRunDateKey: z.string().nullable(),
  lastChatId: z.string().nullable(),
  lastRunAt: z.string().nullable(),
  runningSince: z.string().nullable(),
});

const scheduleResponseSchema = z.object({
  schedule: scheduleSchema,
  due: z.boolean(),
  hostCron: z.string(),
});

const chatRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  eveSession: sessionStateSchema.nullable(),
  events: z.array(z.unknown()),
});

function toChatRecord(value: unknown): ChatRecord {
  const parsed = chatRecordSchema.parse(value);
  return {
    id: parsed.id,
    title: parsed.title,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
    eveSession: parsed.eveSession === null ? null : parseSessionState(parsed.eveSession),
    events: parsed.events.map(parseStreamEvent),
  };
}

async function readBody(response: Response): Promise<unknown> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed (${response.status})`);
  }
  return response.json();
}

export type ScheduleApiResponse = {
  readonly schedule: ScheduledBriefConfig;
  readonly due: boolean;
  readonly hostCron: string;
};

export async function fetchScheduledBrief(): Promise<ScheduleApiResponse> {
  const response = await fetch("/api/briefs/schedule", { cache: "no-store" });
  const data = await readBody(response);
  return scheduleResponseSchema.parse(data);
}

export async function updateScheduledBrief(
  update: ScheduledBriefUpdate,
): Promise<ScheduleApiResponse> {
  const response = await fetch("/api/briefs/schedule", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  const data = await readBody(response);
  return scheduleResponseSchema.parse(data);
}

export type RunBriefApiResult =
  | { readonly skipped: false; readonly chat: ChatRecord }
  | {
      readonly skipped: true;
      readonly reason: "disabled" | "not_due" | "already_running";
    };

export async function runScheduledBriefNow(force = true): Promise<RunBriefApiResult> {
  const response = await fetch("/api/briefs/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ force, source: "ui" }),
  });
  const data = await readBody(response);
  const parsed = z
    .object({
      ok: z.literal(true),
      skipped: z.boolean(),
      reason: z.enum(["disabled", "not_due", "already_running"]).optional(),
      chat: z.unknown().optional(),
    })
    .parse(data);

  if (parsed.skipped) {
    return {
      skipped: true,
      reason: parsed.reason ?? "not_due",
    };
  }

  return {
    skipped: false,
    chat: toChatRecord(parsed.chat),
  };
}
