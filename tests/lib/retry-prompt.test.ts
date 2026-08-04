import { describe, expect, it } from "vitest";
import type { EveMessage } from "eve/react";
import { canOfferRetry, getRetryableUserPrompt } from "@/lib/chat/retry-prompt";

function userMessage(text: string, status?: "failed"): EveMessage {
  return {
    id: `user-${text}`,
    metadata: status ? { status } : undefined,
    parts: [{ type: "text", text }],
    role: "user",
  };
}

function assistantMessage(text: string): EveMessage {
  return {
    id: `assistant-${text}`,
    parts: [{ type: "text", text }],
    role: "assistant",
  };
}

describe("getRetryableUserPrompt", () => {
  it("returns the last user text when it is the latest message", () => {
    expect(getRetryableUserPrompt([userMessage("hello")])).toBe("hello");
  });

  it("walks past a trailing assistant message", () => {
    expect(getRetryableUserPrompt([userMessage("prompt"), assistantMessage("partial")])).toBe(
      "prompt",
    );
  });

  it("returns null when there is no user text", () => {
    expect(getRetryableUserPrompt([assistantMessage("only assistant")])).toBeNull();
    expect(getRetryableUserPrompt([])).toBeNull();
  });
});

describe("canOfferRetry", () => {
  const base = {
    hasVisibleError: true,
    isBusy: false,
    missingApiKey: false,
    retryableText: "hello",
  };

  it("offers retry after a terminal agent error", () => {
    expect(
      canOfferRetry({
        ...base,
        agentStatus: "error",
        lastMessage: assistantMessage("partial"),
      }),
    ).toBe(true);
  });

  it("offers retry for a failed user send", () => {
    expect(
      canOfferRetry({
        ...base,
        agentStatus: "ready",
        lastMessage: userMessage("hello", "failed"),
      }),
    ).toBe(true);
  });

  it("hides retry when the toast is dismissed or send is gated", () => {
    expect(
      canOfferRetry({
        ...base,
        agentStatus: "error",
        hasVisibleError: false,
        lastMessage: userMessage("hello"),
      }),
    ).toBe(false);
    expect(
      canOfferRetry({
        ...base,
        agentStatus: "error",
        isBusy: true,
        lastMessage: userMessage("hello"),
      }),
    ).toBe(false);
    expect(
      canOfferRetry({
        ...base,
        agentStatus: "error",
        missingApiKey: true,
        lastMessage: userMessage("hello"),
      }),
    ).toBe(false);
  });
});
