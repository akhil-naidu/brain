import { describe, expect, it } from "vitest";
import {
  FALLBACK_SCHEDULE_DEFAULT_TIME,
  formatScheduleLastRun,
  formatScheduleTimeValue,
  parseScheduleTimeValue,
  readScheduleDefaultTime,
  writeScheduleDefaultTime,
} from "@/lib/chat/schedule-defaults";

describe("schedule defaults", () => {
  it("parses and formats local times", () => {
    expect(parseScheduleTimeValue("09:30")).toEqual({ hour: 9, minute: 30 });
    expect(parseScheduleTimeValue("25:00")).toBeNull();
    expect(formatScheduleTimeValue(9, 5)).toBe("09:05");
  });

  it("persists the preferred schedule time", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };

    expect(readScheduleDefaultTime(storage)).toEqual(FALLBACK_SCHEDULE_DEFAULT_TIME);
    writeScheduleDefaultTime({ hour: 7, minute: 15 }, storage);
    expect(readScheduleDefaultTime(storage)).toEqual({ hour: 7, minute: 15 });
  });

  it("formats last-run status for people", () => {
    expect(formatScheduleLastRun(null, "UTC")).toBe("Not run yet");
    expect(
      formatScheduleLastRun(
        "2026-08-03T09:00:00.000Z",
        "UTC",
        new Date("2026-08-03T09:00:30.000Z"),
      ),
    ).toBe("Last ran just now");
    expect(
      formatScheduleLastRun(
        "2026-08-03T09:00:00.000Z",
        "UTC",
        new Date("2026-08-03T09:20:00.000Z"),
      ),
    ).toBe("Last ran 20m ago");
    expect(
      formatScheduleLastRun(
        "2026-08-03T09:00:00.000Z",
        "UTC",
        new Date("2026-08-04T12:00:00.000Z"),
      ),
    ).toContain("Last ran");
  });
});
