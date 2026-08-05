import {
  isScheduledBriefDue,
  isScheduledBriefRunning,
  localDateKey,
  morningBriefChatTitle,
  readScheduledBriefConfig,
  replaceScheduledBriefConfig,
  type ScheduledBriefConfig,
} from "@/lib/chat/scheduled-brief";
import { runScheduledPromptTurn, type ScheduledSlackResult } from "@/lib/chat/run-scheduled-prompt";
import type { ChatRecord } from "@/lib/chat/store/types";
import { MORNING_BRIEF_PROMPT } from "@/lib/chat/welcome-prompts";

export type ScheduledBriefSlackResult = ScheduledSlackResult;

export type RunScheduledBriefResult =
  | {
      readonly ok: true;
      readonly skipped: false;
      readonly chat: ChatRecord;
      readonly slack: ScheduledSlackResult;
    }
  | {
      readonly ok: true;
      readonly skipped: true;
      readonly reason: "disabled" | "not_due" | "already_running";
      readonly config: ScheduledBriefConfig;
    };

export { resolveEveHttpHost } from "@/lib/chat/eve-http-host";

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

  const title = morningBriefChatTitle(now, config.timezone);

  try {
    const { chat, slack } = await runScheduledPromptTurn({
      title,
      prompt: MORNING_BRIEF_PROMPT,
      slackDeliveryEnabled: config.slackDeliveryEnabled,
      slackChannel: config.slackChannel,
    });

    const completedAt = new Date();
    await replaceScheduledBriefConfig({
      ...config,
      runningSince: null,
      lastRunAt: completedAt.toISOString(),
      lastRunDateKey: localDateKey(completedAt, config.timezone),
      lastChatId: chat.id,
      lastSlackError: slack.attempted && !slack.ok ? slack.error : null,
    });

    return { ok: true, skipped: false, chat, slack };
  } catch (error) {
    const latest = await readScheduledBriefConfig();
    await replaceScheduledBriefConfig({
      ...latest,
      runningSince: null,
    });
    throw error;
  }
}
