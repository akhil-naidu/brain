import { describe, expect, it } from "vitest";
import {
  defaultScheduledBriefConfig,
  isScheduledBriefDue,
  isScheduledBriefRunning,
  localDateKey,
  morningBriefChatTitle,
  parseScheduledBriefConfig,
} from "@/lib/chat/scheduled-brief";

describe("scheduled brief due logic", () => {
  it("is due at the configured local minute on a weekday", () => {
    const config = {
      ...defaultScheduledBriefConfig(),
      enabled: true,
      hour: 9,
      minute: 0,
      timezone: "UTC",
      weekdaysOnly: true,
    };
    // Monday 09:00 UTC
    const now = new Date("2026-08-03T09:00:00.000Z");
    expect(isScheduledBriefDue(config, now)).toBe(true);
  });

  it("is not due on weekends when weekdaysOnly is set", () => {
    const config = {
      ...defaultScheduledBriefConfig(),
      enabled: true,
      hour: 9,
      minute: 0,
      timezone: "UTC",
      weekdaysOnly: true,
    };
    // Saturday 09:00 UTC
    const now = new Date("2026-08-01T09:00:00.000Z");
    expect(isScheduledBriefDue(config, now)).toBe(false);
  });

  it("is not due after a successful run the same local day", () => {
    const now = new Date("2026-08-03T09:00:00.000Z");
    const config = {
      ...defaultScheduledBriefConfig(),
      enabled: true,
      hour: 9,
      minute: 0,
      timezone: "UTC",
      weekdaysOnly: true,
      lastRunDateKey: localDateKey(now, "UTC"),
    };
    expect(isScheduledBriefDue(config, now)).toBe(false);
  });

  it("respects a non-UTC timezone", () => {
    const config = {
      ...defaultScheduledBriefConfig(),
      enabled: true,
      hour: 9,
      minute: 30,
      timezone: "Asia/Kolkata",
      weekdaysOnly: false,
    };
    // 09:30 IST = 04:00 UTC
    const now = new Date("2026-08-03T04:00:00.000Z");
    expect(isScheduledBriefDue(config, now)).toBe(true);
    expect(isScheduledBriefDue(config, new Date("2026-08-03T04:01:00.000Z"))).toBe(false);
  });

  it("treats a fresh runningSince as already running", () => {
    const now = new Date("2026-08-03T09:00:00.000Z");
    const config = {
      ...defaultScheduledBriefConfig(),
      runningSince: now.toISOString(),
    };
    expect(isScheduledBriefRunning(config, now)).toBe(true);
  });

  it("defaults missing Slack fields on older config files", () => {
    const parsed = parseScheduledBriefConfig({
      enabled: false,
      hour: 9,
      minute: 0,
      timezone: "UTC",
      weekdaysOnly: true,
      lastRunDateKey: null,
      lastChatId: null,
      lastRunAt: null,
      runningSince: null,
    });
    expect(parsed?.slackDeliveryEnabled).toBe(false);
    expect(parsed?.slackChannel).toBeNull();
    expect(parsed?.lastSlackError).toBeNull();
  });
});

describe("scheduled brief helpers", () => {
  it("titles the brief chat with a local date", () => {
    const title = morningBriefChatTitle(new Date("2026-08-03T12:00:00.000Z"), "UTC");
    expect(title).toContain("Morning brief");
    expect(title).toContain("Aug");
  });
});
