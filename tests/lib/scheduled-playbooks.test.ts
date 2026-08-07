import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createScheduledPlaybook,
  isScheduledPlaybookDue,
  readScheduledPlaybooks,
  scheduledPlaybookChatTitle,
  updateScheduledPlaybook,
} from "@/lib/chat/scheduled-playbooks";
import { resetUserDataStoreForTests } from "@/lib/chat/user-data/postgres-user-data-store";
import { getPool, resetPoolForTests } from "@/lib/db/pool";

const DATABASE_URL = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

if (!DATABASE_URL) {
  describe.skip("scheduled playbooks store (BRAIN_DATABASE_URL not set)", () => {
    it.skip("skipped", () => {});
  });
} else {
  describe("scheduled playbooks store", () => {
    beforeAll(async () => {
      // Tables created by ensureBrainSchema.
    });

    beforeEach(async () => {
      resetUserDataStoreForTests();
      const pool = getPool();
      await pool.query(
        "DELETE FROM playbook_schedule WHERE workspace_id IN ('workspace-1', 'workspace-2')",
      );
    });

    afterEach(() => {
      resetUserDataStoreForTests();
    });

    afterAll(async () => {
      await resetPoolForTests();
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
}

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
