import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  defaultScheduledBriefConfig,
  readScheduledBriefConfig,
  replaceScheduledBriefConfig,
  writeScheduledBriefConfig,
} from "@/lib/chat/scheduled-brief";
import { resetUserDataStoreForTests } from "@/lib/chat/user-data/sqlite-user-data-store";

describe("scheduled brief persistence (sqlite)", () => {
  let dir: string;
  let previousDb: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "brain-brief-"));
    previousDb = process.env["BRAIN_CHATS_DB_PATH"];
    process.env["BRAIN_CHATS_DB_PATH"] = path.join(dir, "chats.sqlite");
    resetUserDataStoreForTests();
  });

  afterEach(() => {
    resetUserDataStoreForTests();
    if (previousDb === undefined) {
      delete process.env["BRAIN_CHATS_DB_PATH"];
    } else {
      process.env["BRAIN_CHATS_DB_PATH"] = previousDb;
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes and reads schedule config per user", async () => {
    const written = await writeScheduledBriefConfig("user-1", {
      enabled: true,
      hour: 8,
      minute: 15,
      timezone: "America/New_York",
      weekdaysOnly: false,
      slackDeliveryEnabled: true,
      slackChannel: "#alerts",
    });
    expect(written.enabled).toBe(true);
    expect(written.slackChannel).toBe("#alerts");
    expect(await readScheduledBriefConfig("user-1")).toEqual(written);
    expect(await readScheduledBriefConfig("user-2")).toEqual(defaultScheduledBriefConfig());
  });

  it("clears stale runningSince on read", async () => {
    const stale = new Date(Date.now() - 60 * 60_000).toISOString();
    await replaceScheduledBriefConfig("user-1", {
      ...defaultScheduledBriefConfig(),
      runningSince: stale,
    });
    const read = await readScheduledBriefConfig("user-1");
    expect(read.runningSince).toBeNull();
  });
});
