import { Client } from "eve/client";
import {
  isScheduledBriefDue,
  isScheduledBriefRunning,
  localDateKey,
  morningBriefChatTitle,
  readScheduledBriefConfig,
  replaceScheduledBriefConfig,
  type ScheduledBriefConfig,
} from "@/lib/chat/scheduled-brief";
import { getChatStore } from "@/lib/chat/store";
import type { ChatRecord } from "@/lib/chat/store/types";
import { MORNING_BRIEF_PROMPT } from "@/lib/chat/welcome-prompts";

export type RunScheduledBriefResult =
  | {
      readonly ok: true;
      readonly skipped: false;
      readonly chat: ChatRecord;
    }
  | {
      readonly ok: true;
      readonly skipped: true;
      readonly reason: "disabled" | "not_due" | "already_running";
      readonly config: ScheduledBriefConfig;
    };

export function resolveEveHttpHost(env: Record<string, string | undefined> = process.env): string {
  const configured = env["EVE_BASE_URL"]?.trim() || env["BRAIN_EVE_URL"]?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const evePort = env["EVE_NEXT_PRODUCTION_PORT"]?.trim() || "4274";
  if (env["NODE_ENV"] === "production") {
    return `http://127.0.0.1:${evePort}`;
  }

  const nextPort = env["PORT"]?.trim() || "3000";
  return `http://127.0.0.1:${nextPort}`;
}

export async function runScheduledBrief(
  options: {
    readonly force?: boolean;
    readonly now?: Date;
  } = {},
): Promise<RunScheduledBriefResult> {
  const now = options.now ?? new Date();
  const force = options.force === true;
  let config = await readScheduledBriefConfig();

  if (!force && !config.enabled) {
    return { ok: true, skipped: true, reason: "disabled", config };
  }

  if (!force && !isScheduledBriefDue(config, now)) {
    return { ok: true, skipped: true, reason: "not_due", config };
  }

  if (isScheduledBriefRunning(config, now)) {
    return { ok: true, skipped: true, reason: "already_running", config };
  }

  config = await replaceScheduledBriefConfig({
    ...config,
    runningSince: now.toISOString(),
  });

  const store = getChatStore();
  const chat = store.createChat({
    title: morningBriefChatTitle(now, config.timezone),
  });

  try {
    const client = new Client({
      host: resolveEveHttpHost(),
      preserveCompletedSessions: true,
    });
    const session = client.session();
    const response = await session.send(MORNING_BRIEF_PROMPT);

    store.updateChat(chat.id, {
      eveSession: {
        sessionId: response.sessionId,
        continuationToken: response.continuationToken,
        streamIndex: 0,
      },
    });

    const result = await response.result();
    const updated = store.updateChat(chat.id, {
      eveSession: session.state,
      events: result.events,
    });

    if (!updated) {
      throw new Error("Failed to persist morning brief chat.");
    }

    if (result.status === "failed") {
      throw new Error("Morning brief session failed.");
    }

    const completedAt = new Date();
    await replaceScheduledBriefConfig({
      ...config,
      runningSince: null,
      lastRunAt: completedAt.toISOString(),
      lastRunDateKey: localDateKey(completedAt, config.timezone),
      lastChatId: updated.id,
    });

    return { ok: true, skipped: false, chat: updated };
  } catch (error) {
    const latest = await readScheduledBriefConfig();
    await replaceScheduledBriefConfig({
      ...latest,
      runningSince: null,
      lastChatId: chat.id,
    });
    throw error;
  }
}
