import { describe, expect, it } from "vitest";
import { HOME_CHAT_DEMO_TURNS } from "@/lib/features/catalog";
import { buildHomeChatDemoBeats, homeChatDemoPosterMessages } from "@/lib/features/home-chat-demo";

describe("buildHomeChatDemoBeats", () => {
  it("plays every turn from idle through a completed reply", () => {
    const beats = buildHomeChatDemoBeats();
    const userChars = HOME_CHAT_DEMO_TURNS.reduce((sum, turn) => sum + turn.user.length, 0);
    const assistantChars = HOME_CHAT_DEMO_TURNS.reduce(
      (sum, turn) => sum + turn.assistant.length,
      0,
    );
    expect(beats[0]?.phase).toBe("idle");
    expect(beats.filter((beat) => beat.phase === "typing")).toHaveLength(userChars);
    expect(beats.filter((beat) => beat.phase === "stream")).toHaveLength(assistantChars);
    expect(
      beats.find((beat) => beat.phase === "typing" && beat.composer.length === 1)?.delayMs,
    ).toBeGreaterThanOrEqual(36);
    expect(beats.find((beat) => beat.phase === "stream")?.delayMs).toBeGreaterThanOrEqual(24);
    const poster = homeChatDemoPosterMessages();
    expect(poster.filter((message) => message.kind === "user")).toHaveLength(
      HOME_CHAT_DEMO_TURNS.length,
    );
    expect(beats.at(-1)?.messages).toEqual(poster);
  });
});
