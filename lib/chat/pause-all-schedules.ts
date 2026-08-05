import { fetchScheduledBrief, updateScheduledBrief } from "@/lib/chat/scheduled-brief-api";
import {
  listScheduledPlaybooks,
  updateScheduledPlaybookApi,
} from "@/lib/chat/scheduled-playbooks-api";

const PAUSE_SNAPSHOT_KEY = "brain.schedules.pause-snapshot.v1";

type PauseSnapshot = {
  readonly briefEnabled: boolean;
  readonly playbookIds: readonly string[];
};

function readSnapshot(): PauseSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(PAUSE_SNAPSHOT_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("briefEnabled" in parsed) ||
      !("playbookIds" in parsed)
    ) {
      return null;
    }
    const briefEnabled = (parsed as { briefEnabled: unknown }).briefEnabled;
    const playbookIds = (parsed as { playbookIds: unknown }).playbookIds;
    if (typeof briefEnabled !== "boolean" || !Array.isArray(playbookIds)) {
      return null;
    }
    if (!playbookIds.every((id) => typeof id === "string")) {
      return null;
    }
    return { briefEnabled, playbookIds };
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: PauseSnapshot): void {
  window.localStorage.setItem(PAUSE_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function clearSnapshot(): void {
  window.localStorage.removeItem(PAUSE_SNAPSHOT_KEY);
}

export function hasSchedulesPauseSnapshot(): boolean {
  return readSnapshot() !== null;
}

/** Disable morning brief and all playbook schedules; remember what was on for Resume. */
export async function pauseAllSchedules(): Promise<void> {
  const [brief, playbooks] = await Promise.all([fetchScheduledBrief(), listScheduledPlaybooks()]);
  writeSnapshot({
    briefEnabled: brief.schedule.enabled,
    playbookIds: playbooks.filter((item) => item.enabled).map((item) => item.id),
  });

  await updateScheduledBrief({ enabled: false });
  await Promise.all(
    playbooks
      .filter((item) => item.enabled)
      .map((item) => updateScheduledPlaybookApi(item.id, { enabled: false })),
  );
}

/** Restore schedules that were enabled when Pause all was used. */
export async function resumeAllSchedules(): Promise<void> {
  const snapshot = readSnapshot();
  if (!snapshot) {
    return;
  }

  if (snapshot.briefEnabled) {
    await updateScheduledBrief({ enabled: true });
  }

  const playbooks = await listScheduledPlaybooks();
  const ids = new Set(snapshot.playbookIds);
  await Promise.all(
    playbooks
      .filter((item) => ids.has(item.id) && !item.enabled)
      .map((item) => updateScheduledPlaybookApi(item.id, { enabled: true })),
  );

  clearSnapshot();
}
