import { describe, expect, it } from "vitest";
import type { ModelMessage } from "ai";
import {
  extractChatModeFromMessages,
  isAskModeTurn,
  shouldOmitHarnessTool,
} from "@/agent/lib/client-context-model";

function userContext(payload: Record<string, unknown>): ModelMessage {
  return {
    role: "user",
    content: `Client context:\n${JSON.stringify(payload)}`,
  };
}

describe("chat mode from client context", () => {
  it("defaults to agent when mode is missing", () => {
    const messages = [userContext({ modelId: "deepseek/deepseek-v4-pro" })];
    expect(extractChatModeFromMessages(messages)).toBe("agent");
    expect(isAskModeTurn(messages)).toBe(false);
  });

  it("reads ask mode from the newest client context", () => {
    const messages = [
      userContext({ mode: "agent" }),
      userContext({ mode: "ask", modelId: "deepseek/deepseek-v4-pro" }),
    ];
    expect(extractChatModeFromMessages(messages)).toBe("ask");
    expect(isAskModeTurn(messages)).toBe(true);
  });

  it("normalizes unknown mode values to agent", () => {
    const messages = [userContext({ mode: "wizard" })];
    expect(extractChatModeFromMessages(messages)).toBe("agent");
    expect(extractChatModeFromMessages([userContext({ mode: "plan" })])).toBe("agent");
    expect(extractChatModeFromMessages([userContext({ mode: "debug" })])).toBe("agent");
  });

  it("omits harness tools only in ask mode", () => {
    expect(shouldOmitHarnessTool([userContext({ mode: "ask" })])).toBe(true);
    expect(shouldOmitHarnessTool([userContext({ mode: "agent" })])).toBe(false);
  });
});
