import { describe, expect, it, vi } from "vitest";
import {
  formatMorningBriefSlackMessage,
  looksLikeSlackConversationId,
  resolveSlackChannelId,
} from "@/lib/chat/slack-brief-delivery";

describe("formatMorningBriefSlackMessage", () => {
  it("wraps the brief with a title", () => {
    expect(formatMorningBriefSlackMessage("Two tasks need you.", "Morning brief — Mon")).toBe(
      "*Morning brief — Mon*\n\nTwo tasks need you.\n\n_From Brain_",
    );
  });

  it("clips very long briefs", () => {
    const long = "x".repeat(4000);
    const formatted = formatMorningBriefSlackMessage(long, "Morning brief");
    expect(formatted.length).toBeLessThan(4000);
    expect(formatted).toContain("…");
  });
});

describe("looksLikeSlackConversationId", () => {
  it("accepts channel and group ids", () => {
    expect(looksLikeSlackConversationId("C0123ABC")).toBe(true);
    expect(looksLikeSlackConversationId("G0123ABC")).toBe(true);
    expect(looksLikeSlackConversationId("#alerts")).toBe(false);
  });
});

describe("resolveSlackChannelId", () => {
  it("returns conversation ids unchanged", async () => {
    await expect(resolveSlackChannelId("token", "C0123ABC")).resolves.toBe("C0123ABC");
  });

  it("resolves #name via conversations.list", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          ok: true,
          channels: [
            { id: "C999", name: "general" },
            { id: "C123", name: "alerts" },
          ],
        }),
        { status: 200 },
      );
    });

    await expect(resolveSlackChannelId("token", "#alerts", fetchImpl)).resolves.toBe("C123");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
