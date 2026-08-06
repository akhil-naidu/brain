import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SCHEDULED_BRIEF_STALE_RUN_MS,
  scheduleRunClaimTimestamps,
} from "@/lib/chat/scheduled-brief";
import {
  createSqliteUserDataStore,
  resetUserDataStoreForTests,
  type UserDataStore,
} from "@/lib/chat/user-data/sqlite-user-data-store";

describe("schedule run compare-and-swap", () => {
  let dir: string;
  let store: UserDataStore;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "brain-schedule-cas-"));
    resetUserDataStoreForTests();
    store = createSqliteUserDataStore(path.join(dir, "chats.sqlite"));
  });

  afterEach(() => {
    store.close();
    resetUserDataStoreForTests();
    rmSync(dir, { recursive: true, force: true });
  });

  it("allows only one fresh claim on a playbook schedule", () => {
    const created = store.createPlaybookSchedule("user-1", {
      label: "Triage",
      prompt: "Triage",
      timezone: "UTC",
    });
    const now = new Date("2026-08-06T12:00:00.000Z");
    const claim = scheduleRunClaimTimestamps(now);

    const first = store.tryClaimPlaybookScheduleRun("user-1", created.id, claim);
    expect(first?.runningSince).toBe(claim.runningSince);

    const second = store.tryClaimPlaybookScheduleRun("user-1", created.id, {
      runningSince: "2026-08-06T12:00:01.000Z",
      staleBefore: claim.staleBefore,
    });
    expect(second).toBeNull();
    expect(store.getPlaybookSchedule(created.id)?.runningSince).toBe(claim.runningSince);
  });

  it("allows reclaim after the lock goes stale", () => {
    const created = store.createPlaybookSchedule("user-1", {
      label: "Triage",
      prompt: "Triage",
      timezone: "UTC",
    });
    const started = new Date("2026-08-06T12:00:00.000Z");
    expect(
      store.tryClaimPlaybookScheduleRun("user-1", created.id, scheduleRunClaimTimestamps(started)),
    ).not.toBeNull();

    const later = new Date(started.getTime() + SCHEDULED_BRIEF_STALE_RUN_MS + 1_000);
    const reclaim = scheduleRunClaimTimestamps(later);
    const claimed = store.tryClaimPlaybookScheduleRun("user-1", created.id, reclaim);
    expect(claimed?.runningSince).toBe(reclaim.runningSince);
  });

  it("allows only one fresh claim on a morning brief", () => {
    const now = new Date("2026-08-06T09:00:00.000Z");
    const claim = scheduleRunClaimTimestamps(now);
    expect(store.tryClaimMorningBriefRun("user-1", claim)?.runningSince).toBe(claim.runningSince);
    expect(
      store.tryClaimMorningBriefRun("user-1", {
        runningSince: "2026-08-06T09:00:01.000Z",
        staleBefore: claim.staleBefore,
      }),
    ).toBeNull();
  });
});
