import type { Playbook } from "@/lib/chat/playbooks";
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

/** Create a weekday 9:00 schedule from a playbook, or return the existing one. */
export async function schedulePlaybookQuick(playbook: Playbook): Promise<QuickScheduleResult> {
  const listed = await listScheduledPlaybooks();
  const existing = listed.find((item) => item.sourcePlaybookId === playbook.id);
  if (existing) {
    return { status: "already_scheduled", schedule: existing };
  }
  if (listed.length >= MAX_SCHEDULED_PLAYBOOKS) {
    return { status: "at_limit" };
  }

  const schedule = await createScheduledPlaybookApi({
    label: playbook.label,
    prompt: playbook.prompt,
    sourcePlaybookId: playbook.id,
    hour: 9,
    minute: 0,
    timezone: browserTimeZone(),
    weekdaysOnly: true,
    enabled: true,
  });
  return { status: "created", schedule };
}
