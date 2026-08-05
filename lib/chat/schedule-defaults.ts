export const SCHEDULE_DEFAULT_TIME_STORAGE_KEY = "brain.schedule-default-time.v1";

export type ScheduleDefaultTime = {
  readonly hour: number;
  readonly minute: number;
};

export const FALLBACK_SCHEDULE_DEFAULT_TIME: ScheduleDefaultTime = {
  hour: 9,
  minute: 0,
};

export function formatScheduleTimeValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function parseScheduleTimeValue(value: string): ScheduleDefaultTime | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const hour = Number.parseInt(match[1] ?? "", 10);
  const minute = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return null;
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    return null;
  }
  return { hour, minute };
}

export function readScheduleDefaultTime(
  storage: Pick<Storage, "getItem"> | null = typeof window === "undefined"
    ? null
    : window.localStorage,
): ScheduleDefaultTime {
  if (!storage) {
    return FALLBACK_SCHEDULE_DEFAULT_TIME;
  }
  try {
    const raw = storage.getItem(SCHEDULE_DEFAULT_TIME_STORAGE_KEY);
    if (!raw) {
      return FALLBACK_SCHEDULE_DEFAULT_TIME;
    }
    const parsed = parseScheduleTimeValue(raw);
    return parsed ?? FALLBACK_SCHEDULE_DEFAULT_TIME;
  } catch {
    return FALLBACK_SCHEDULE_DEFAULT_TIME;
  }
}

export function writeScheduleDefaultTime(
  time: ScheduleDefaultTime,
  storage: Pick<Storage, "setItem"> | null = typeof window === "undefined"
    ? null
    : window.localStorage,
): void {
  if (!storage) {
    return;
  }
  storage.setItem(
    SCHEDULE_DEFAULT_TIME_STORAGE_KEY,
    formatScheduleTimeValue(time.hour, time.minute),
  );
}

/** Friendly last-run line for schedule UIs. */
export function formatScheduleLastRun(
  lastRunAt: string | null,
  timeZone: string,
  now: Date = new Date(),
): string {
  if (!lastRunAt) {
    return "Not run yet";
  }
  const date = new Date(lastRunAt);
  if (Number.isNaN(date.getTime())) {
    return "Not run yet";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const ageMs = now.getTime() - date.getTime();
  if (ageMs >= 0 && ageMs < 60_000) {
    return "Last ran just now";
  }
  if (ageMs >= 0 && ageMs < 3_600_000) {
    const minutes = Math.max(1, Math.round(ageMs / 60_000));
    return `Last ran ${minutes}m ago`;
  }

  return `Last ran ${formatter.format(date)}`;
}
