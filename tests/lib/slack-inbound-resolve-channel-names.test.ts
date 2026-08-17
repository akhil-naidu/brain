import { describe, expect, it } from "vitest";
import {
  parseSlackInboundChannelLines,
  resolveSlackInboundChannelEntries,
  SlackChannelResolveError,
} from "@/lib/chat/slack-inbound/resolve-channel-names";

describe("parseSlackInboundChannelLines", () => {
  it("keeps one trimmed entry per non-empty line", () => {
    expect(parseSlackInboundChannelLines("C1\n\n #general \nC2")).toEqual(["C1", "#general", "C2"]);
  });
});

describe("resolveSlackInboundChannelEntries", () => {
  it("uppercases C and G ids without listing conversations", async () => {
    const ids = await resolveSlackInboundChannelEntries(["c0123ok", "G123"], async () => {
      throw new Error("should not list");
    });
    expect(ids).toEqual(["C0123OK", "G123"]);
  });

  it("resolves #names case-insensitively", async () => {
    const ids = await resolveSlackInboundChannelEntries(["#General"], async () => [
      { id: "C012GEN", name: "general" },
    ]);
    expect(ids).toEqual(["C012GEN"]);
  });

  it("rejects unknown names and junk tokens", async () => {
    await expect(
      resolveSlackInboundChannelEntries(["#missing"], async () => [{ id: "C1", name: "general" }]),
    ).rejects.toBeInstanceOf(SlackChannelResolveError);
    await expect(
      resolveSlackInboundChannelEntries(["not-a-channel"], async () => []),
    ).rejects.toBeInstanceOf(SlackChannelResolveError);
  });
});
