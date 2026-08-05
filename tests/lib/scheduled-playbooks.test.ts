import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createScheduledPlaybook,
  isScheduledPlaybookDue,
  readScheduledPlaybooks,
  scheduledPlaybookChatTitle,
  updateScheduledPlaybook,
} from "@/lib/chat/scheduled-playbooks";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempPath() {
  const dir = await mkdtemp(path.join(tmpdir(), "brain-playbook-sched-"));
  tempDirs.push(dir);
  return path.join(dir, "scheduled-playbooks.json");
}

describe("scheduled playbooks store", () => {
  it("creates and lists a schedule with a prompt snapshot", async () => {
    const filePath = await tempPath();
    const created = await createScheduledPlaybook(
      {
        label: "Triage inbox",
        prompt: "Triage important unread email.",
        sourcePlaybookId: "pb-1",
        hour: 8,
        minute: 30,
        timezone: "UTC",
      },
      filePath,
    );

    expect(created.label).toBe("Triage inbox");
    expect(created.prompt).toBe("Triage important unread email.");
    expect(created.sourcePlaybookId).toBe("pb-1");
    expect(created.enabled).toBe(true);

    const listed = await readScheduledPlaybooks(filePath);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);
  });

  it("updates enable and time", async () => {
    const filePath = await tempPath();
    const created = await createScheduledPlaybook(
      {
        label: "Sprint risks",
        prompt: "List sprint risks.",
        timezone: "UTC",
      },
      filePath,
    );

    const updated = await updateScheduledPlaybook(
      created.id,
      { enabled: false, hour: 10, minute: 15 },
      filePath,
    );
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
    expect(isScheduledPlaybookDue(schedule, new Date("2026-08-03T09:00:00.000Z"))).toBe(true);
    expect(isScheduledPlaybookDue(schedule, new Date("2026-08-01T09:00:00.000Z"))).toBe(false);
  });
});

describe("scheduledPlaybookChatTitle", () => {
  it("includes label and local date", () => {
    const title = scheduledPlaybookChatTitle(
      "Triage inbox",
      new Date("2026-08-03T12:00:00.000Z"),
      "UTC",
    );
    expect(title).toContain("Triage inbox");
    expect(title).toContain("Aug");
  });
});
