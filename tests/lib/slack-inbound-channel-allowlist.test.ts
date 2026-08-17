import { describe, expect, it } from "vitest";
import {
  isSlackInboundChannelAllowed,
  parseSlackInboundChannelIdList,
  resolveSlackInboundChannelAllowlist,
} from "@/lib/chat/slack-inbound/channel-allowlist";

describe("parseSlackInboundChannelIdList", () => {
  it("splits on commas and whitespace", () => {
    expect(parseSlackInboundChannelIdList("C1, C2\nC3")).toEqual(["C1", "C2", "C3"]);
  });

  it("returns empty for missing or blank input", () => {
    expect(parseSlackInboundChannelIdList(undefined)).toEqual([]);
    expect(parseSlackInboundChannelIdList("  ")).toEqual([]);
  });
});

describe("resolveSlackInboundChannelAllowlist", () => {
  it("is unrestricted when nothing is stored and env is unset", () => {
    expect(
      resolveSlackInboundChannelAllowlist({
        storedChannelIds: undefined,
        envChannelIds: undefined,
      }),
    ).toEqual({ channelIds: [], source: null });
  });

  it("uses a stored empty list and ignores env", () => {
    expect(
      resolveSlackInboundChannelAllowlist({
        storedChannelIds: [],
        envChannelIds: "C-env",
      }),
    ).toEqual({ channelIds: [], source: "stored" });
  });

  it("prefers stored ids over env", () => {
    expect(
      resolveSlackInboundChannelAllowlist({
        storedChannelIds: ["C-ok"],
        envChannelIds: "C-env",
      }),
    ).toEqual({ channelIds: ["C-ok"], source: "stored" });
  });

  it("falls back to env when the stored key is absent", () => {
    expect(
      resolveSlackInboundChannelAllowlist({
        storedChannelIds: undefined,
        envChannelIds: "C-env, C-two",
      }),
    ).toEqual({ channelIds: ["C-env", "C-two"], source: "env" });
  });
});

describe("isSlackInboundChannelAllowed", () => {
  it("allows mentions when the list is empty", () => {
    expect(
      isSlackInboundChannelAllowed({
        isDirectMessage: false,
        channelId: "C-any",
        allowedChannelIds: [],
      }),
    ).toBe(true);
  });

  it("allows a listed channel and denies others", () => {
    expect(
      isSlackInboundChannelAllowed({
        isDirectMessage: false,
        channelId: "C-ok",
        allowedChannelIds: ["C-ok"],
      }),
    ).toBe(true);
    expect(
      isSlackInboundChannelAllowed({
        isDirectMessage: false,
        channelId: "C-other",
        allowedChannelIds: ["C-ok"],
      }),
    ).toBe(false);
  });

  it("always allows DMs", () => {
    expect(
      isSlackInboundChannelAllowed({
        isDirectMessage: true,
        channelId: "D1",
        allowedChannelIds: ["C-ok"],
      }),
    ).toBe(true);
  });
});
