import { describe, expect, it } from "vitest";
import {
  BRAIN_CHAT_MODES,
  cycleBrainChatMode,
  isBrainChatMode,
  resolveBrainChatMode,
} from "@/lib/chat/chat-mode";

describe("brain chat modes", () => {
  it("includes ask and agent only", () => {
    expect([...BRAIN_CHAT_MODES]).toEqual(["ask", "agent"]);
  });

  it("resolves known modes and falls back to agent", () => {
    expect(isBrainChatMode("ask")).toBe(true);
    expect(isBrainChatMode("plan")).toBe(false);
    expect(resolveBrainChatMode("ask")).toBe("ask");
    expect(resolveBrainChatMode("plan")).toBe("agent");
    expect(resolveBrainChatMode("debug")).toBe("agent");
    expect(resolveBrainChatMode(null)).toBe("agent");
  });

  it("cycles Ask ↔ Agent with Shift+Tab helper", () => {
    expect(cycleBrainChatMode("ask", "next")).toBe("agent");
    expect(cycleBrainChatMode("agent", "next")).toBe("ask");
  });
});
