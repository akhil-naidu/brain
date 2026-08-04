import type { EveMessage } from "eve/react";
import { describe, expect, it } from "vitest";
import { messageToMarkdown, messagesToMarkdown } from "@/lib/chat/export-markdown";

describe("messagesToMarkdown", () => {
  it("returns empty string for empty threads", () => {
    expect(messagesToMarkdown([])).toBe("");
  });

  it("exports user and assistant text with optional title", () => {
    const messages: EveMessage[] = [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Hello **world**" }],
      },
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "text", text: "Hi there" },
          {
            type: "dynamic-tool",
            toolCallId: "c1",
            toolName: "search",
            state: "output-available",
            input: {},
            output: { ok: true },
          },
        ],
      },
    ];

    expect(messagesToMarkdown(messages, "My chat")).toBe(
      [
        "# My chat",
        "",
        "## User",
        "",
        "Hello **world**",
        "",
        "## Assistant",
        "",
        "Hi there",
        "",
        "_Tool: search_",
      ].join("\n"),
    );
  });

  it("skips messages with no exportable parts", () => {
    const messages: EveMessage[] = [
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "step-start" }],
      },
    ];
    expect(messagesToMarkdown(messages)).toBe("");
  });
});

describe("messageToMarkdown", () => {
  it("exports a single message body without a role heading", () => {
    const message: EveMessage = {
      id: "a1",
      role: "assistant",
      parts: [{ type: "text", text: "Just the reply" }],
    };
    expect(messageToMarkdown(message)).toBe("Just the reply");
  });

  it("returns empty string when there is nothing to copy", () => {
    const message: EveMessage = {
      id: "a1",
      role: "assistant",
      parts: [{ type: "step-start" }],
    };
    expect(messageToMarkdown(message)).toBe("");
  });
});
