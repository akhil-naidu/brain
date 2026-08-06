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
      readonly userId: string;
    }
  | {
      readonly ok: true;
      readonly skipped: true;
      readonly reason: "disabled" | "not_due" | "already_running" | "not_found";
      readonly config?: ScheduledBriefConfig;
      readonly userId?: string;
    };

export { resolveEveHttpHost } from "@/lib/chat/eve-http-host";

export async function runScheduledBrief(options: {
  readonly userId: string;
  readonly force?: boolean;
  readonly now?: Date;
}): Promise<RunScheduledBriefResult> {
  const now = options.now ?? new Date();
  const force = options.force === true;
  const userId = options.userId;
  let config = await readScheduledBriefConfig(userId);

  if (!force && !config.enabled) {
    return { ok: true, skipped: true, reason: "disabled", config, userId };
  }

  if (!force && !isScheduledBriefDue(config, now)) {
    return { ok: true, skipped: true, reason: "not_due", config, userId };
  }

  const claimed = getUserDataStore().tryClaimMorningBriefRun(
    userId,
    scheduleRunClaimTimestamps(now),
  );
  if (!claimed) {
    return { ok: true, skipped: true, reason: "already_running", config, userId };
  }
  config = claimed;

  const title = morningBriefChatTitle(now, config.timezone);

  try {
    const { chat, slack } = await runScheduledPromptTurn({
      userId,
      title,
      prompt: MORNING_BRIEF_PROMPT,
      slackDeliveryEnabled: config.slackDeliveryEnabled,
      slackChannel: config.slackChannel,
    });

    const completedAt = new Date();
    await replaceScheduledBriefConfig(userId, {
      ...config,
      runningSince: null,
      lastRunAt: completedAt.toISOString(),
      lastRunDateKey: localDateKey(completedAt, config.timezone),
      lastChatId: chat.id,
      lastSlackError: slack.attempted && !slack.ok ? slack.error : null,
    });

    return { ok: true, skipped: false, chat, slack, userId };
  } catch (error) {
    const latest = await readScheduledBriefConfig(userId);
    await replaceScheduledBriefConfig(userId, {
      ...latest,
      runningSince: null,
    });
    throw error;
  }
}

async function runDueBriefQueue(
  items: readonly { readonly userId: string }[],
  now: Date,
  results: readonly RunScheduledBriefResult[] = [],
): Promise<readonly RunScheduledBriefResult[]> {
  const [item, ...rest] = items;
  if (!item) {
    return results;
  }
  const result = await runScheduledBrief({ userId: item.userId, force: false, now });
  return runDueBriefQueue(rest, now, [...results, result]);
}

export async function runDueScheduledBriefs(
  now: Date = new Date(),
): Promise<readonly RunScheduledBriefResult[]> {
  const configs = await listScheduledBriefConfigs();
  const due = configs.filter((item) => {
    const { userId: _userId, ...config } = item;
    return isScheduledBriefDue(config, now);
  });
  return runDueBriefQueue(due, now);
}
