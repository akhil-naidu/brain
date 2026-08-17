import { describe, expect, it, vi } from "vitest";
import {
  extraSlackInboundChannelIds,
  loadSlackInboundChannelPicker,
  markSlackInboundChannelsSelected,
  slackInboundAllowlistSaveText,
} from "@/lib/chat/slack-inbound/channel-picker";

describe("markSlackInboundChannelsSelected", () => {
  it("flags channels that are on the effective allowlist", () => {
    expect(
      markSlackInboundChannelsSelected(
        [
          { id: "C1", name: "general" },
          { id: "C2", name: "eng" },
        ],
        ["c2"],
      ),
    ).toEqual([
      { id: "C1", name: "general", selected: false },
      { id: "C2", name: "eng", selected: true },
    ]);
  });
});

describe("extraSlackInboundChannelIds", () => {
  it("keeps effective ids that Slack did not list", () => {
    expect(extraSlackInboundChannelIds(["C1", "C-secret"], ["C1"])).toEqual(["C-secret"]);
  });
});

describe("slackInboundAllowlistSaveText", () => {
  it("writes an empty list when the switch is off", () => {
    expect(
      slackInboundAllowlistSaveText({
        limitMentions: false,
        selectedIds: ["C1"],
        extraText: "C2",
      }),
    ).toEqual({ ok: true, allowedChannelsText: "" });
  });

  it("unions selected ids and extra paste when limiting", () => {
    expect(
      slackInboundAllowlistSaveText({
        limitMentions: true,
        selectedIds: ["C1"],
        extraText: "C2\nC1",
      }),
    ).toEqual({ ok: true, allowedChannelsText: "C1\nC2" });
  });

  it("refuses a limiting save with nothing selected", () => {
    const result = slackInboundAllowlistSaveText({
      limitMentions: true,
      selectedIds: [],
      extraText: "  \n",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/at least one channel/i);
    }
  });
});

describe("loadSlackInboundChannelPicker", () => {
  it("does not list conversations without a bot token", async () => {
    const listConversations = vi.fn(async () => [{ id: "C1", name: "general" }]);
    await expect(
      loadSlackInboundChannelPicker({
        botToken: null,
        effectiveIds: ["C1"],
        listConversations,
      }),
    ).resolves.toEqual({
      ok: false,
      error: "Save a bot token to load Slack channels.",
    });
    expect(listConversations).not.toHaveBeenCalled();
  });

  it("marks selected channels from the effective allowlist", async () => {
    await expect(
      loadSlackInboundChannelPicker({
        botToken: "xoxb-test",
        effectiveIds: ["C2"],
        listConversations: async () => [
          { id: "C1", name: "general" },
          { id: "C2", name: "eng" },
        ],
      }),
    ).resolves.toEqual({
      ok: true,
      channels: [
        { id: "C1", name: "general", selected: false },
        { id: "C2", name: "eng", selected: true },
      ],
    });
  });
});
