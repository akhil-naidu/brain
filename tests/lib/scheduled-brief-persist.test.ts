import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  defaultScheduledBriefConfig,
  readScheduledBriefConfig,
  replaceScheduledBriefConfig,
  writeScheduledBriefConfig,
} from "@/lib/chat/scheduled-brief";
import { resetUserDataStoreForTests } from "@/lib/chat/user-data/postgres-user-data-store";
import { getPool, resetPoolForTests } from "@/lib/db/pool";

const DATABASE_URL = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

if (!DATABASE_URL) {
  describe.skip("scheduled brief persistence (BRAIN_DATABASE_URL not set)", () => {
    it.skip("skipped", () => {});
  });
} else {
  describe("scheduled brief persistence", () => {
    beforeAll(async () => {
      // Tables created by ensureBrainSchema.
    });

    beforeEach(async () => {
      resetUserDataStoreForTests();
      const pool = getPool();
      await pool.query(
        "DELETE FROM morning_brief_schedule WHERE workspace_id IN ('workspace-1', 'workspace-2')",
      );
    });

    afterEach(() => {
      resetUserDataStoreForTests();
    });

    afterAll(async () => {
      await resetPoolForTests();
    });

    it("writes and reads schedule config per workspace and user", async () => {
      const written = await writeScheduledBriefConfig("workspace-1", "user-1", {
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
      expect(await readScheduledBriefConfig("workspace-1", "user-1")).toEqual(written);
      expect(await readScheduledBriefConfig("workspace-2", "user-2")).toEqual(
        defaultScheduledBriefConfig(),
      );
    });

    it("clears stale runningSince on read", async () => {
      const stale = new Date(Date.now() - 60 * 60_000).toISOString();
      await replaceScheduledBriefConfig("workspace-1", "user-1", {
        ...defaultScheduledBriefConfig(),
        runningSince: stale,
      });
      const read = await readScheduledBriefConfig("workspace-1", "user-1");
      expect(read.runningSince).toBeNull();
    });
  });
}
