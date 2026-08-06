import {
  isScheduledBriefDue,
  listScheduledBriefConfigs,
  localDateKey,
  morningBriefChatTitle,
  readScheduledBriefConfig,
  replaceScheduledBriefConfig,
  scheduleRunClaimTimestamps,
  type ScheduledBriefConfig,
} from "@/lib/chat/scheduled-brief";
import { runScheduledPromptTurn, type ScheduledSlackResult } from "@/lib/chat/run-scheduled-prompt";
import type { ChatRecord } from "@/lib/chat/store/types";
import { getUserDataStore } from "@/lib/chat/user-data/sqlite-user-data-store";
import { MORNING_BRIEF_PROMPT } from "@/lib/chat/welcome-prompts";

export type ScheduledBriefSlackResult = ScheduledSlackResult;

export type RunScheduledBriefResult =
  | {
      readonly ok: true;
      readonly skipped: false;
      readonly chat: ChatRecord;
      readonly slack: ScheduledSlackResult;
      readonly workspaceId: string;
      readonly runAsUserId: string;
    }
  | {
      readonly ok: true;
      readonly skipped: true;
      readonly reason: "disabled" | "not_due" | "already_running" | "not_found";
      readonly config?: ScheduledBriefConfig;
      readonly workspaceId?: string;
      readonly runAsUserId?: string;
    };

export { resolveEveHttpHost } from "@/lib/chat/eve-http-host";

export async function runScheduledBrief(options: {
  readonly workspaceId: string;
  readonly runAsUserId: string;
  readonly force?: boolean;
  readonly now?: Date;
}): Promise<RunScheduledBriefResult> {
  const now = options.now ?? new Date();
  const force = options.force === true;
  const workspaceId = options.workspaceId;
  const runAsUserId = options.runAsUserId;
  let config = await readScheduledBriefConfig(workspaceId, runAsUserId);

  if (!force && !config.enabled) {
    return { ok: true, skipped: true, reason: "disabled", config, workspaceId, runAsUserId };
  }

  if (!force && !isScheduledBriefDue(config, now)) {
    return { ok: true, skipped: true, reason: "not_due", config, workspaceId, runAsUserId };
  }

  const claimed = getUserDataStore().tryClaimMorningBriefRun(
    workspaceId,
    runAsUserId,
    scheduleRunClaimTimestamps(now),
  );
  if (!claimed) {
    return { ok: true, skipped: true, reason: "already_running", config, workspaceId, runAsUserId };
  }
  config = claimed;

  const title = morningBriefChatTitle(now, config.timezone);

  try {
    const { chat, slack } = await runScheduledPromptTurn({
      userId: runAsUserId,
      workspaceId,
      title,
      prompt: MORNING_BRIEF_PROMPT,
      slackDeliveryEnabled: config.slackDeliveryEnabled,
      slackChannel: config.slackChannel,
    });

    const completedAt = new Date();
    await replaceScheduledBriefConfig(workspaceId, runAsUserId, {
      ...config,
      runningSince: null,
      lastRunAt: completedAt.toISOString(),
      lastRunDateKey: localDateKey(completedAt, config.timezone),
      lastChatId: chat.id,
      lastSlackError: slack.attempted && !slack.ok ? slack.error : null,
    });

    return { ok: true, skipped: false, chat, slack, workspaceId, runAsUserId };
  } catch (error) {
    const latest = await readScheduledBriefConfig(workspaceId, runAsUserId);
    await replaceScheduledBriefConfig(workspaceId, runAsUserId, {
      ...latest,
      runningSince: null,
    });
    throw error;
  }
}

async function runDueBriefQueue(
  items: readonly { readonly workspaceId: string; readonly runAsUserId: string }[],
  now: Date,
  results: readonly RunScheduledBriefResult[] = [],
): Promise<readonly RunScheduledBriefResult[]> {
  const [item, ...rest] = items;
  if (!item) {
    return results;
  }
  const result = await runScheduledBrief({
    workspaceId: item.workspaceId,
    runAsUserId: item.runAsUserId,
    force: false,
    now,
  });
  return runDueBriefQueue(rest, now, [...results, result]);
}

export async function runDueScheduledBriefs(
  now: Date = new Date(),
): Promise<readonly RunScheduledBriefResult[]> {
  const configs = await listScheduledBriefConfigs();
  const due = configs.filter((item) => {
    const { workspaceId: _workspaceId, runAsUserId: _runAsUserId, ...config } = item;
    return isScheduledBriefDue(config, now);
  });
  return runDueBriefQueue(due, now);
}
