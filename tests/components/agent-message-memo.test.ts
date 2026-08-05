import type { EveMessage } from "eve/react";
import { describe, expect, it, vi } from "vitest";
import { areAgentMessagePropsEqual } from "@/components/chat/message";

const settledUser = {
  id: "user-1",
  metadata: { status: "complete" },
  parts: [{ type: "text" as const, text: "Hello", state: "done" as const }],
  role: "user" as const,
} as EveMessage;

const settledAssistant = {
  id: "turn-1:assistant",
  metadata: { status: "complete", turnId: "turn-1" },
  parts: [{ type: "text" as const, text: "Hi", state: "done" as const }],
  role: "assistant" as const,
} as EveMessage;

describe("areAgentMessagePropsEqual", () => {
  it("skips settled rows when only callback identity changes", () => {
    const previous = {
      canRespond: false,
      isStreaming: false,
      message: settledAssistant,
      onInputResponses: vi.fn(),
    };
    const next = {
      ...previous,
      onInputResponses: vi.fn(),
    };

    expect(areAgentMessagePropsEqual(previous, next)).toBe(true);
  });

  it("skips settled rows when the failure map reference changes but is unused", () => {
    const previous = {
      canRespond: false,
      childFailuresByCallId: new Map(),
      isStreaming: false,
      message: settledUser,
      onInputResponses: vi.fn(),
    };
    const next = {
      ...previous,
      childFailuresByCallId: new Map(),
    };

    expect(areAgentMessagePropsEqual(previous, next)).toBe(true);
  });

  it("re-renders when the projected message body changes", () => {
    const previous = {
      canRespond: false,
      isStreaming: true,
      message: settledAssistant,
      onInputResponses: vi.fn(),
    };
    const nextMessage: EveMessage = {
      id: settledAssistant.id,
      metadata: settledAssistant.metadata,
      parts: [{ type: "text", text: "Hi there", state: "streaming" }],
      role: "assistant",
    };
    const next = {
      ...previous,
      message: nextMessage,
    };

    expect(areAgentMessagePropsEqual(previous, next)).toBe(false);
  });

  it("re-renders pending-input rows when canRespond changes", () => {
    const pending: EveMessage = {
      id: "turn-2:assistant",
      metadata: { status: "streaming", turnId: "turn-2" },
      parts: [
        {
          type: "dynamic-tool",
          toolCallId: "call-1",
          toolName: "ask_question",
          state: "approval-requested",
          input: {},
          approval: { id: "req-1" },
          toolMetadata: {
            eve: {
              kind: "tool-call",
              name: "ask_question",
              inputRequest: {
                prompt: "Continue?",
                requestId: "req-1",
              },
            },
          },
        },
      ],
      role: "assistant",
    };

    const previous = {
      canRespond: true,
      isStreaming: false,
      message: pending,
      onInputResponses: vi.fn(),
    };
    const next = {
      ...previous,
      canRespond: false,
    };

    expect(areAgentMessagePropsEqual(previous, next)).toBe(false);
  });
});
