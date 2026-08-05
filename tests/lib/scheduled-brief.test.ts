import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  defaultScheduledBriefConfig,
  hostCronExample,
  isScheduledBriefDue,
  isScheduledBriefRunning,
  localDateKey,
  morningBriefChatTitle,
  parseScheduledBriefConfig,
  readScheduledBriefConfig,
  writeScheduledBriefConfig,
} from "@/lib/chat/scheduled-brief";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempConfigPath() {
  const dir = await mkdtemp(path.join(tmpdir(), "brain-brief-"));
  tempDirs.push(dir);
  return path.join(dir, "scheduled-brief.json");
}

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
});

describe("scheduled brief persistence", () => {
  it("writes and reads schedule config", async () => {
    const filePath = await tempConfigPath();
    const written = await writeScheduledBriefConfig(
      {
        enabled: true,
        hour: 8,
        minute: 15,
        timezone: "America/New_York",
        weekdaysOnly: false,
      },
      filePath,
    );
    expect(written.enabled).toBe(true);
    expect(written.hour).toBe(8);
    expect(written.minute).toBe(15);

    const raw = await readFile(filePath, "utf8");
    expect(parseScheduledBriefConfig(JSON.parse(raw) as unknown)).toEqual(written);

    const read = await readScheduledBriefConfig(filePath);
    expect(read).toEqual(written);
  });
});

describe("scheduled brief helpers", () => {
  it("builds a host cron example with force", () => {
    const config = {
      ...defaultScheduledBriefConfig(),
      hour: 9,
      minute: 0,
      weekdaysOnly: true,
    };
    expect(hostCronExample(config, "http://localhost:3000")).toBe(
      "0 9 * * 1-5 curl -fsS -X POST http://localhost:3000/api/briefs/run -H 'content-type: application/json' -d '{\"force\":true}'",
    );
  });

  it("titles the brief chat with a local date", () => {
    const title = morningBriefChatTitle(new Date("2026-08-03T12:00:00.000Z"), "UTC");
    expect(title).toContain("Morning brief");
    expect(title).toContain("Aug");
  });
});
