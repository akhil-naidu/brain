import type { HandleMessageStreamEvent } from "eve/client";
import type { EveMessage } from "eve/react";
import { describe, expect, it } from "vitest";
import {
  hasVisibleAssistantContent,
  resolveAssistantEmptyOutcome,
} from "@/lib/chat/assistant-empty-outcome";

function assistant(parts: EveMessage["parts"], id = "turn-1:assistant"): EveMessage {
  return {
    id,
    metadata: { turnId: "turn-1", status: "complete" },
    parts,
    role: "assistant",
  };
}

describe("hasVisibleAssistantContent", () => {
  it("is false for empty or whitespace-only text", () => {
    expect(hasVisibleAssistantContent(assistant([]))).toBe(false);
    expect(
      hasVisibleAssistantContent(assistant([{ type: "text", text: "   ", state: "done" }])),
    ).toBe(false);
  });

  it("is true when text or tools are present", () => {
    expect(
      hasVisibleAssistantContent(assistant([{ type: "text", text: "Hi", state: "done" }])),
    ).toBe(true);
  });
});

describe("resolveAssistantEmptyOutcome", () => {
  it("returns null while streaming or when content exists", () => {
    expect(
      resolveAssistantEmptyOutcome({
        agentStatus: "streaming",
        events: [],
        isLatestAssistant: true,
        isStreaming: true,
        message: assistant([]),
      }),
    ).toBeNull();

    expect(
      resolveAssistantEmptyOutcome({
        agentStatus: "ready",
        events: [],
        isLatestAssistant: true,
        isStreaming: false,
        message: assistant([{ type: "text", text: "Done", state: "done" }]),
      }),
    ).toBeNull();
  });

  it("marks cancelled empty turns as stopped", () => {
    const events: HandleMessageStreamEvent[] = [
      { data: { sequence: 1, turnId: "turn-1" }, type: "turn.started" },
      { data: { sequence: 2, turnId: "turn-1" }, type: "turn.cancelled" },
    ];

    expect(
      resolveAssistantEmptyOutcome({
        agentStatus: "ready",
        events,
        isLatestAssistant: true,
        isStreaming: false,
        message: assistant([]),
      }),
    ).toBe("stopped");
  });

  it("marks failed or empty-completed turns as failed", () => {
    const failedEvents: HandleMessageStreamEvent[] = [
      {
        data: {
          code: "provider_error",
          message: "Provider unavailable",
          sequence: 2,
          turnId: "turn-1",
        },
        type: "turn.failed",
      },
    ];

    expect(
      resolveAssistantEmptyOutcome({
        agentStatus: "error",
        events: failedEvents,
        isLatestAssistant: true,
        isStreaming: false,
        message: assistant([]),
      }),
    ).toBe("failed");

    expect(
      resolveAssistantEmptyOutcome({
        agentStatus: "ready",
        events: [{ data: { sequence: 2, turnId: "turn-1" }, type: "turn.completed" }],
        isLatestAssistant: true,
        isStreaming: false,
        message: assistant([]),
      }),
    ).toBe("failed");
  });

  it("uses agent error status for the latest empty assistant", () => {
    expect(
      resolveAssistantEmptyOutcome({
        agentStatus: "error",
        events: [],
        isLatestAssistant: true,
        isStreaming: false,
        message: assistant([]),
      }),
    ).toBe("failed");
  });
});
