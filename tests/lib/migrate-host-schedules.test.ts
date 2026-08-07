import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  migrateHostSchedulesIntoStore,
  resolveLegacyScheduledBriefPath,
  resolveScheduledPlaybooksPath,
} from "@/lib/chat/user-data/migrate-host-schedules";
import { ensureAuthReady, resetBrainAuthForTests } from "@/lib/auth/server";
import {
  getUserDataStore,
  resetUserDataStoreForTests,
} from "@/lib/chat/user-data/postgres-user-data-store";
import { getPool, resetPoolForTests } from "@/lib/db/pool";

const DATABASE_URL = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

if (!DATABASE_URL) {
  describe.skip("migrateHostSchedulesIntoStore (BRAIN_DATABASE_URL not set)", () => {
    it.skip("skipped", () => {});
  });
} else {
  describe("migrateHostSchedulesIntoStore", () => {
    let dir: string;
    let previousOperator: string | undefined;
    let previousPlaybooksPath: string | undefined;
    let previousBriefPath: string | undefined;

    beforeAll(async () => {
      resetBrainAuthForTests();
      await ensureAuthReady();
    });

    beforeEach(async () => {
      dir = mkdtempSync(path.join(tmpdir(), "brain-host-migrate-"));
      mkdirSync(path.join(dir, ".eve"), { recursive: true });
      previousOperator = process.env["BRAIN_OPERATOR_USER_ID"];
      previousPlaybooksPath = process.env["BRAIN_SCHEDULED_PLAYBOOKS_PATH"];
      previousBriefPath = process.env["BRAIN_SCHEDULED_BRIEF_PATH"];
      process.env["BRAIN_OPERATOR_USER_ID"] = "operator-1";
      process.env["BRAIN_SCHEDULED_PLAYBOOKS_PATH"] = path.join(
        dir,
        ".eve",
        "scheduled-playbooks.json",
      );
      process.env["BRAIN_SCHEDULED_BRIEF_PATH"] = path.join(dir, ".eve", "scheduled-brief.json");
      resetUserDataStoreForTests();
      // Clean all schedule rows so listAll* empty-gate does not short-circuit migrate.
      const pool = getPool();
      await pool.query("TRUNCATE playbook_schedule, morning_brief_schedule");
    });

    afterEach(async () => {
      resetUserDataStoreForTests();
      if (previousOperator === undefined) {
        delete process.env["BRAIN_OPERATOR_USER_ID"];
      } else {
        process.env["BRAIN_OPERATOR_USER_ID"] = previousOperator;
      }
      if (previousPlaybooksPath === undefined) {
        delete process.env["BRAIN_SCHEDULED_PLAYBOOKS_PATH"];
      } else {
        process.env["BRAIN_SCHEDULED_PLAYBOOKS_PATH"] = previousPlaybooksPath;
      }
      if (previousBriefPath === undefined) {
        delete process.env["BRAIN_SCHEDULED_BRIEF_PATH"];
      } else {
        process.env["BRAIN_SCHEDULED_BRIEF_PATH"] = previousBriefPath;
      }
      rmSync(dir, { recursive: true, force: true });
    });

    afterAll(async () => {
      await resetPoolForTests();
    });

    it("imports host JSON schedules into the operator user once", async () => {
      const playbooksPath = resolveScheduledPlaybooksPath(dir, process.env);
      const briefPath = resolveLegacyScheduledBriefPath(dir, process.env);
      writeFileSync(
        playbooksPath,
        JSON.stringify({
          schedules: [
            {
              id: "sched-1",
              label: "Triage",
              prompt: "Triage mail",
              sourcePlaybookId: null,
              enabled: true,
              hour: 8,
              minute: 0,
              timezone: "UTC",
              weekdaysOnly: true,
              slackDeliveryEnabled: false,
              slackChannel: null,
              lastSlackError: null,
              lastRunDateKey: null,
              lastChatId: null,
              lastRunAt: null,
              runningSince: null,
            },
          ],
        }),
        "utf8",
      );
      writeFileSync(
        briefPath,
        JSON.stringify({
          enabled: true,
          hour: 9,
          minute: 30,
          timezone: "UTC",
          weekdaysOnly: true,
          slackDeliveryEnabled: false,
          slackChannel: null,
          lastSlackError: null,
          lastRunDateKey: null,
          lastChatId: null,
          lastRunAt: null,
          runningSince: null,
        }),
        "utf8",
      );

      const store = getUserDataStore();
      const result = await migrateHostSchedulesIntoStore(store, process.env, dir);
      expect(result).toEqual({ importedPlaybooks: 1, importedBrief: true });
      expect(await store.listPlaybookSchedules("operator-1")).toHaveLength(1);
      expect((await store.getMorningBrief("operator-1", "operator-1")).enabled).toBe(true);
      expect((await store.getMorningBrief("operator-1", "operator-1")).minute).toBe(30);
      expect(existsSync(playbooksPath)).toBe(false);
      expect(existsSync(`${playbooksPath}.migrated`)).toBe(true);
      expect(existsSync(`${briefPath}.migrated`)).toBe(true);

      const second = await migrateHostSchedulesIntoStore(store, process.env, dir);
      expect(second).toEqual({ importedPlaybooks: 0, importedBrief: false });
      await store.close();
    });

    it("retries after an operator user appears", async () => {
      const playbooksPath = resolveScheduledPlaybooksPath(dir, process.env);
      writeFileSync(
        playbooksPath,
        JSON.stringify({
          schedules: [
            {
              id: "sched-late",
              label: "Late",
              prompt: "Import after bootstrap",
              sourcePlaybookId: null,
              enabled: true,
              hour: 7,
              minute: 0,
              timezone: "UTC",
              weekdaysOnly: true,
              slackDeliveryEnabled: false,
              slackChannel: null,
              lastSlackError: null,
              lastRunDateKey: null,
              lastChatId: null,
              lastRunAt: null,
              runningSince: null,
            },
          ],
        }),
        "utf8",
      );

      delete process.env["BRAIN_OPERATOR_USER_ID"];
      const store = getUserDataStore();
      expect(await migrateHostSchedulesIntoStore(store, process.env, dir)).toEqual({
        importedPlaybooks: 0,
        importedBrief: false,
      });
      expect(existsSync(playbooksPath)).toBe(true);

      process.env["BRAIN_OPERATOR_USER_ID"] = "operator-late";
      expect(await migrateHostSchedulesIntoStore(store, process.env, dir)).toEqual({
        importedPlaybooks: 1,
        importedBrief: false,
      });
      expect(await store.listPlaybookSchedules("operator-late")).toHaveLength(1);
      expect(existsSync(`${playbooksPath}.migrated`)).toBe(true);
      await store.close();
    });
  });
}
