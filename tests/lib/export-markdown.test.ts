import type { EveMessage } from "eve/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  downloadTextFile,
  markdownDownloadFilename,
  messageToMarkdown,
  messagesToMarkdown,
  sanitizeDownloadFilenameBase,
} from "@/lib/chat/export-markdown";

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

describe("markdown download helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sanitizes titles and falls back when empty", () => {
    expect(sanitizeDownloadFilenameBase("Sprint notes / v2")).toBe("Sprint-notes-v2");
    expect(sanitizeDownloadFilenameBase("   ")).toBe("brain-chat");
    expect(markdownDownloadFilename("Weekly brief")).toBe("Weekly-brief.md");
    expect(markdownDownloadFilename(null, "brain-message")).toBe("brain-message.md");
  });

  it("downloads the same markdown body the serializers produce", () => {
    const message: EveMessage = {
      id: "a1",
      role: "assistant",
      parts: [{ type: "text", text: "Export me" }],
    };
    const markdown = messageToMarkdown(message);
    expect(markdown).toBe("Export me");

    const createObjectURL = vi.fn((value: Blob) => {
      expect(value).toBeInstanceOf(Blob);
      expect(value.type).toBe("text/markdown;charset=utf-8");
      return "blob:mock";
    });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const anchor = document.createElement("a");
    const click = vi.spyOn(anchor, "click").mockImplementation(() => undefined);
    const remove = vi.spyOn(anchor, "remove").mockImplementation(() => undefined);
    const createElement = vi.spyOn(document, "createElement").mockReturnValue(anchor);
    const append = vi.spyOn(document.body, "append").mockImplementation(() => undefined);

    downloadTextFile(markdownDownloadFilename(null, "brain-message"), markdown);

    expect(createElement).toHaveBeenCalledWith("a");
    expect(anchor.download).toBe("brain-message.md");
    expect(click).toHaveBeenCalledOnce();
    expect(append).toHaveBeenCalledWith(anchor);
    expect(remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });
});
