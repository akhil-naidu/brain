import type { Playbook } from "@/lib/chat/playbooks";
import {
  FALLBACK_SCHEDULE_DEFAULT_TIME,
  type ScheduleDefaultTime,
  writeScheduleDefaultTime,
} from "@/lib/chat/schedule-defaults";
import {
  createScheduledPlaybookApi,
  listScheduledPlaybooks,
  MAX_SCHEDULED_PLAYBOOKS,
  type ScheduledPlaybook,
} from "@/lib/chat/scheduled-playbooks-api";

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export type QuickScheduleResult =
  | { readonly status: "created"; readonly schedule: ScheduledPlaybook }
  | { readonly status: "already_scheduled"; readonly schedule: ScheduledPlaybook }
  | { readonly status: "at_limit" };

/** Create a weekday schedule from a playbook at the chosen local time, or return the existing one. */
export async function schedulePlaybookQuick(
  playbook: Playbook,
  time: ScheduleDefaultTime = FALLBACK_SCHEDULE_DEFAULT_TIME,
): Promise<QuickScheduleResult> {
  const listed = await listScheduledPlaybooks();
  const existing = listed.find((item) => item.sourcePlaybookId === playbook.id);
  if (existing) {
    return { status: "already_scheduled", schedule: existing };
  }
  if (listed.length >= MAX_SCHEDULED_PLAYBOOKS) {
    return { status: "at_limit" };
  }

  writeScheduleDefaultTime(time);

  const schedule = await createScheduledPlaybookApi({
    label: playbook.label,
    prompt: playbook.prompt,
    sourcePlaybookId: playbook.id,
    hour: time.hour,
    minute: time.minute,
    timezone: browserTimeZone(),
    weekdaysOnly: true,
    enabled: true,
  });
  return { status: "created", schedule };
}
