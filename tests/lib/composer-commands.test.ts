import { describe, expect, it } from "vitest";
import {
  buildComposerCommandItems,
  composeDraftWithMentions,
  filterComposerCommandItems,
} from "@/lib/chat/composer-commands";

describe("composer commands", () => {
  const items = buildComposerCommandItems({
    enabledConnections: {
      clickup: false,
      slack: true,
      asana: false,
      gmail: false,
      dflow: false,
      github: false,
      snowflake: false,
    },
    playbooks: [
      {
        id: "pb-1",
        label: "Triage inbox",
        prompt: "Triage my inbox",
        updatedAt: 1,
      },
    ],
    projects: [
      {
        id: "proj-1",
        name: "Research",
        createdAt: "2026-08-10T00:00:00.000Z",
        updatedAt: "2026-08-10T00:00:00.000Z",
        userId: "user-a",
        workspaceId: "ws-1",
      },
    ],
    schedules: [
      {
        id: "sch-1",
        label: "Morning brief",
        prompt: "Brief me",
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
      },
    ],
  });

  it("includes connections, projects, playbooks, and schedules", () => {
    expect(items.some((item) => item.id === "connection:clickup")).toBe(true);
    expect(items.some((item) => item.id === "project:proj-1")).toBe(true);
    expect(items.some((item) => item.id === "playbook:pb-1")).toBe(true);
    expect(items.some((item) => item.id === "schedule:sch-1")).toBe(true);
  });

  it("filters by query", () => {
    const filtered = filterComposerCommandItems(items, "research");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("project:proj-1");
  });

  it("composes draft text with mention badges", () => {
    expect(
      composeDraftWithMentions("summarize blockers", [
        { mentionText: "@ClickUp" },
        { mentionText: "@project Research" },
      ]),
    ).toBe("@ClickUp @project Research summarize blockers");
  });
});
