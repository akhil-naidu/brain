import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createScheduledPlaybook,
  isScheduledPlaybookDue,
  readScheduledPlaybooks,
  scheduledPlaybookChatTitle,
  updateScheduledPlaybook,
} from "@/lib/chat/scheduled-playbooks";
import { resetUserDataStoreForTests } from "@/lib/chat/user-data/sqlite-user-data-store";

describe("scheduled playbooks store", () => {
  let dir: string;
  let previousDb: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "brain-playbook-sched-"));
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

  it("creates and lists a schedule with a prompt snapshot", async () => {
    const created = await createScheduledPlaybook("workspace-1", "user-1", {
      label: "Triage inbox",
      prompt: "Triage important unread email.",
      sourcePlaybookId: "pb-1",
      hour: 8,
      minute: 30,
      timezone: "UTC",
    });

    expect(created.label).toBe("Triage inbox");
    expect(created.prompt).toBe("Triage important unread email.");
    expect(created.sourcePlaybookId).toBe("pb-1");
    expect(created.enabled).toBe(true);

    const listed = await readScheduledPlaybooks("workspace-1");
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);
    expect(await readScheduledPlaybooks("workspace-2")).toHaveLength(0);
  });

  it("updates enable and time", async () => {
    const created = await createScheduledPlaybook("workspace-1", "user-1", {
      label: "Sprint risks",
      prompt: "List sprint risks.",
      timezone: "UTC",
    });

    const updated = await updateScheduledPlaybook("workspace-1", created.id, {
      enabled: false,
      hour: 10,
      minute: 15,
    });
    expect(updated.enabled).toBe(false);
    expect(updated.hour).toBe(10);
    expect(updated.minute).toBe(15);
  });
});

describe("scheduled playbook due logic", () => {
  it("is due at the configured weekday minute", () => {
    const schedule = {
      id: "1",
      label: "Triage",
      prompt: "Triage",
      sourcePlaybookId: null,
      enabled: true,
      hour: 9,
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
    };
    const now = new Date("2026-08-03T09:00:00.000Z");
    expect(isScheduledPlaybookDue(schedule, now)).toBe(true);
  });

  it("builds a chat title from label and local date", () => {
    const title = scheduledPlaybookChatTitle("Triage", new Date("2026-08-03T09:00:00.000Z"), "UTC");
    expect(title).toContain("Triage");
  });
});
