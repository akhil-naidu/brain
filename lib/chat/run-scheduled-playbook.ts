import { runScheduledPromptTurn, type ScheduledSlackResult } from "@/lib/chat/run-scheduled-prompt";
import {
  isScheduledPlaybookDue,
  isScheduledPlaybookRunning,
  markPlaybookScheduleCompleted,
  readScheduledPlaybooks,
  replaceScheduledPlaybook,
  scheduledPlaybookChatTitle,
  type ScheduledPlaybook,
} from "@/lib/chat/scheduled-playbooks";
import type { ChatRecord } from "@/lib/chat/store/types";

export type RunScheduledPlaybookResult =
  | {
      readonly ok: true;
      readonly skipped: false;
      readonly schedule: ScheduledPlaybook;
      readonly chat: ChatRecord;
      readonly slack: ScheduledSlackResult;
    }
  | {
      readonly ok: true;
      readonly skipped: true;
      readonly reason: "not_found" | "disabled" | "not_due" | "already_running";
      readonly schedule?: ScheduledPlaybook;
    };

export async function runScheduledPlaybook(options: {
  readonly id: string;
  readonly force?: boolean;
  readonly now?: Date;
}): Promise<RunScheduledPlaybookResult> {
  const now = options.now ?? new Date();
  const force = options.force === true;
  const schedules = await readScheduledPlaybooks();
  let schedule = schedules.find((item) => item.id === options.id);
  if (!schedule) {
    return { ok: true, skipped: true, reason: "not_found" };
  }

  if (!force && !schedule.enabled) {
    return { ok: true, skipped: true, reason: "disabled", schedule };
  }

  if (!force && !isScheduledPlaybookDue(schedule, now)) {
    return { ok: true, skipped: true, reason: "not_due", schedule };
  }

  if (isScheduledPlaybookRunning(schedule, now)) {
    return { ok: true, skipped: true, reason: "already_running", schedule };
  }

  schedule = await replaceScheduledPlaybook({
    ...schedule,
    runningSince: now.toISOString(),
  });

  const title = scheduledPlaybookChatTitle(schedule.label, now, schedule.timezone);

  try {
    const { chat, slack } = await runScheduledPromptTurn({
      title,
      prompt: schedule.prompt,
      slackDeliveryEnabled: schedule.slackDeliveryEnabled,
      slackChannel: schedule.slackChannel,
    });

    const completed = await replaceScheduledPlaybook(
      markPlaybookScheduleCompleted(schedule, {
        chatId: chat.id,
        completedAt: new Date(),
        slackError: slack.attempted && !slack.ok ? slack.error : null,
      }),
    );

    return { ok: true, skipped: false, schedule: completed, chat, slack };
  } catch (error) {
    const latest = (await readScheduledPlaybooks()).find((item) => item.id === options.id);
    if (latest) {
      await replaceScheduledPlaybook({
        ...latest,
        runningSince: null,
      });
    }
    throw error;
  }
}

async function runDueQueue(
  ids: readonly string[],
  now: Date,
  results: readonly RunScheduledPlaybookResult[] = [],
): Promise<readonly RunScheduledPlaybookResult[]> {
  const [id, ...rest] = ids;
  if (!id) {
    return results;
  }
  const result = await runScheduledPlaybook({ id, force: false, now });
  return runDueQueue(rest, now, [...results, result]);
}

export async function runDueScheduledPlaybooks(
  now: Date = new Date(),
): Promise<readonly RunScheduledPlaybookResult[]> {
  const schedules = await readScheduledPlaybooks();
  const dueIds = schedules
    .filter((item) => isScheduledPlaybookDue(item, now))
    .map((item) => item.id);
  return runDueQueue(dueIds, now);
}
