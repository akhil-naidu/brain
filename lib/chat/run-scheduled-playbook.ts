import { scheduleRunClaimTimestamps } from "@/lib/chat/scheduled-brief";
import { getUserDataStore } from "@/lib/chat/user-data/sqlite-user-data-store";
import { runScheduledPromptTurn, type ScheduledSlackResult } from "@/lib/chat/run-scheduled-prompt";
import {
  isScheduledPlaybookDue,
  markPlaybookScheduleCompleted,
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
  readonly workspaceId?: string;
}): Promise<RunScheduledPlaybookResult> {
  const now = options.now ?? new Date();
  const force = options.force === true;
  const found = getUserDataStore().getPlaybookSchedule(options.id);
  if (!found) {
    return { ok: true, skipped: true, reason: "not_found" };
  }
  if (options.workspaceId && found.workspaceId !== options.workspaceId) {
    return { ok: true, skipped: true, reason: "not_found" };
  }

  const { workspaceId, runAsUserId, ...scheduleBase } = found;
  let schedule: ScheduledPlaybook = scheduleBase;

  if (!force && !schedule.enabled) {
    return { ok: true, skipped: true, reason: "disabled", schedule };
  }

  if (!force && !isScheduledPlaybookDue(schedule, now)) {
    return { ok: true, skipped: true, reason: "not_due", schedule };
  }

  const claimed = getUserDataStore().tryClaimPlaybookScheduleRun(
    workspaceId,
    options.id,
    scheduleRunClaimTimestamps(now),
  );
  if (!claimed) {
    return { ok: true, skipped: true, reason: "already_running", schedule };
  }
  const { workspaceId: _claimedWorkspace, runAsUserId: _claimedUser, ...claimedSchedule } = claimed;
  schedule = claimedSchedule;

  const title = scheduledPlaybookChatTitle(schedule.label, now, schedule.timezone);

  try {
    const { chat, slack } = await runScheduledPromptTurn({
      userId: runAsUserId,
      workspaceId,
      title,
      prompt: schedule.prompt,
      slackDeliveryEnabled: schedule.slackDeliveryEnabled,
      slackChannel: schedule.slackChannel,
    });

    const completed = await replaceScheduledPlaybook(
      workspaceId,
      runAsUserId,
      markPlaybookScheduleCompleted(schedule, {
        chatId: chat.id,
        completedAt: new Date(),
        slackError: slack.attempted && !slack.ok ? slack.error : null,
      }),
    );

    return { ok: true, skipped: false, schedule: completed, chat, slack };
  } catch (error) {
    const latest = getUserDataStore().getPlaybookSchedule(options.id);
    if (latest) {
      const { workspaceId: latestWorkspace, runAsUserId: latestUser, ...rest } = latest;
      await replaceScheduledPlaybook(latestWorkspace, latestUser, {
        ...rest,
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
  const schedules = getUserDataStore().listAllPlaybookSchedules();
  const dueIds = schedules
    .filter((item) => isScheduledPlaybookDue(item, now))
    .map((item) => item.id);
  return runDueQueue(dueIds, now);
}
