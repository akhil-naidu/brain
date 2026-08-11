import { describe, expect, it } from "vitest";
import type { ModelMessage } from "ai";
import {
  extractChatModeFromMessages,
  isAskModeTurn,
  isDebugModeTurn,
  isPlanModeTurn,
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
    expect(isPlanModeTurn(messages)).toBe(false);
    expect(isDebugModeTurn(messages)).toBe(false);
  });

  it("reads ask mode from the newest client context", () => {
    const messages = [
      userContext({ mode: "agent" }),
      userContext({ mode: "ask", modelId: "deepseek/deepseek-v4-pro" }),
    ];
    expect(extractChatModeFromMessages(messages)).toBe("ask");
    expect(isAskModeTurn(messages)).toBe(true);
  });

  it("reads plan and debug modes", () => {
    expect(extractChatModeFromMessages([userContext({ mode: "plan" })])).toBe("plan");
    expect(isPlanModeTurn([userContext({ mode: "plan" })])).toBe(true);
    expect(extractChatModeFromMessages([userContext({ mode: "debug" })])).toBe("debug");
    expect(isDebugModeTurn([userContext({ mode: "debug" })])).toBe(true);
  });

  it("normalizes unknown mode values to agent", () => {
    const messages = [userContext({ mode: "wizard" })];
    expect(extractChatModeFromMessages(messages)).toBe("agent");
  });

  it("omits all harness tools in ask and mutating tools in plan", () => {
    const ask = [userContext({ mode: "ask" })];
    const plan = [userContext({ mode: "plan" })];
    const agent = [userContext({ mode: "agent" })];
    const debug = [userContext({ mode: "debug" })];

    expect(shouldOmitHarnessTool(ask, "all")).toBe(true);
    expect(shouldOmitHarnessTool(ask, "mutating")).toBe(true);
    expect(shouldOmitHarnessTool(plan, "all")).toBe(false);
    expect(shouldOmitHarnessTool(plan, "mutating")).toBe(true);
    expect(shouldOmitHarnessTool(agent, "all")).toBe(false);
    expect(shouldOmitHarnessTool(agent, "mutating")).toBe(false);
    expect(shouldOmitHarnessTool(debug, "mutating")).toBe(false);
  });
});
