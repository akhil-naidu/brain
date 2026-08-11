import { describe, expect, it } from "vitest";
import { isBrainChatMode, resolveBrainChatMode, BRAIN_CHAT_MODES } from "@/lib/chat/chat-mode";

describe("brain chat modes", () => {
  it("includes ask, agent, plan, and debug", () => {
    expect([...BRAIN_CHAT_MODES]).toEqual(["ask", "agent", "plan", "debug"]);
  });

  it("resolves known modes and falls back to agent", () => {
    expect(isBrainChatMode("plan")).toBe(true);
    expect(resolveBrainChatMode("debug")).toBe("debug");
    expect(resolveBrainChatMode("nope")).toBe("agent");
    expect(resolveBrainChatMode(null)).toBe("agent");
  });
});
