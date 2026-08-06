import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  migrateHostSchedulesIntoStore,
  resolveLegacyScheduledBriefPath,
  resolveScheduledPlaybooksPath,
} from "@/lib/chat/user-data/migrate-host-schedules";
import {
  createSqliteUserDataStore,
  resetUserDataStoreForTests,
} from "@/lib/chat/user-data/sqlite-user-data-store";

describe("migrateHostSchedulesIntoStore", () => {
  let dir: string;
  let previousOperator: string | undefined;
  let previousPlaybooksPath: string | undefined;
  let previousBriefPath: string | undefined;

  beforeEach(() => {
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
  });

  afterEach(() => {
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

  it("imports host JSON schedules into the operator user once", () => {
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

    const store = createSqliteUserDataStore(path.join(dir, "chats.sqlite"));
    const result = migrateHostSchedulesIntoStore(store, process.env, dir);
    expect(result).toEqual({ importedPlaybooks: 1, importedBrief: true });
    expect(store.listPlaybookSchedules("operator-1")).toHaveLength(1);
    expect(store.getMorningBrief("operator-1").enabled).toBe(true);
    expect(store.getMorningBrief("operator-1").minute).toBe(30);
    expect(existsSync(playbooksPath)).toBe(false);
    expect(existsSync(`${playbooksPath}.migrated`)).toBe(true);
    expect(existsSync(`${briefPath}.migrated`)).toBe(true);
    const migratedRaw: unknown = JSON.parse(readFileSync(`${playbooksPath}.migrated`, "utf8"));
    expect(migratedRaw).toMatchObject({ schedules: [{ id: "sched-1" }] });

    const second = migrateHostSchedulesIntoStore(store, process.env, dir);
    expect(second).toEqual({ importedPlaybooks: 0, importedBrief: false });
    store.close();
  });
});
