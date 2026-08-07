import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  SCHEDULED_BRIEF_STALE_RUN_MS,
  scheduleRunClaimTimestamps,
} from "@/lib/chat/scheduled-brief";
import {
  getUserDataStore,
  resetUserDataStoreForTests,
  type UserDataStore,
} from "@/lib/chat/user-data/postgres-user-data-store";
import { getPool, resetPoolForTests } from "@/lib/db/pool";

const DATABASE_URL = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

if (!DATABASE_URL) {
  describe.skip("schedule run compare-and-swap (BRAIN_DATABASE_URL not set)", () => {
    it.skip("skipped", () => {});
  });
} else {
  describe("schedule run compare-and-swap", () => {
    let store: UserDataStore;

    beforeAll(async () => {
      // Tables created by ensureBrainSchema.
    });

    beforeEach(async () => {
      resetUserDataStoreForTests();
      const pool = getPool();
      await pool.query("DELETE FROM playbook_schedule WHERE workspace_id = 'workspace-1'");
      await pool.query("DELETE FROM morning_brief_schedule WHERE workspace_id = 'workspace-1'");
      store = getUserDataStore();
    });

    afterEach(async () => {
      await store.close();
      resetUserDataStoreForTests();
    });

    afterAll(async () => {
      await resetPoolForTests();
    });

    it("allows only one fresh claim on a playbook schedule", async () => {
      const created = await store.createPlaybookSchedule("workspace-1", "user-1", {
        label: "Triage",
        prompt: "Triage",
        timezone: "UTC",
      });
      const now = new Date("2026-08-06T12:00:00.000Z");
      const claim = scheduleRunClaimTimestamps(now);

      const first = await store.tryClaimPlaybookScheduleRun("workspace-1", created.id, claim);
      expect(first?.runningSince).toBe(claim.runningSince);

      const second = await store.tryClaimPlaybookScheduleRun("workspace-1", created.id, {
        runningSince: "2026-08-06T12:00:01.000Z",
        staleBefore: claim.staleBefore,
      });
      expect(second).toBeNull();
      expect((await store.getPlaybookSchedule(created.id))?.runningSince).toBe(claim.runningSince);
    });

    it("allows reclaim after the lock goes stale", async () => {
      const created = await store.createPlaybookSchedule("workspace-1", "user-1", {
        label: "Triage",
        prompt: "Triage",
        timezone: "UTC",
      });
      const started = new Date("2026-08-06T12:00:00.000Z");
      expect(
        await store.tryClaimPlaybookScheduleRun(
          "workspace-1",
          created.id,
          scheduleRunClaimTimestamps(started),
        ),
      ).not.toBeNull();

      const later = new Date(started.getTime() + SCHEDULED_BRIEF_STALE_RUN_MS + 1_000);
      const reclaim = scheduleRunClaimTimestamps(later);
      const claimed = await store.tryClaimPlaybookScheduleRun("workspace-1", created.id, reclaim);
      expect(claimed?.runningSince).toBe(reclaim.runningSince);
    });

    it("allows only one fresh claim on a morning brief", async () => {
      const now = new Date("2026-08-06T09:00:00.000Z");
      const claim = scheduleRunClaimTimestamps(now);
      expect(
        (await store.tryClaimMorningBriefRun("workspace-1", "user-1", claim))?.runningSince,
      ).toBe(claim.runningSince);
      expect(
        await store.tryClaimMorningBriefRun("workspace-1", "user-1", {
          runningSince: "2026-08-06T09:00:01.000Z",
          staleBefore: claim.staleBefore,
        }),
      ).toBeNull();
    });
  });
}
