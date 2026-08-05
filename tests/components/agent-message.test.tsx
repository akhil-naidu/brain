import type { EveMessage } from "eve/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentMessage } from "@/components/chat/message";

afterEach(cleanup);

const writeText = vi.fn(async () => undefined);

Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: { writeText },
});

const userMessage = {
  id: "user-1",
  parts: [{ type: "text" as const, text: "Original prompt" }],
  role: "user" as const,
} as EveMessage;

describe("AgentMessage edit", () => {
  it("resends edited text", () => {
    const onEditResend = vi.fn();

    render(
      <AgentMessage
        canEdit
        canRespond={false}
        isStreaming={false}
        message={userMessage}
        onEditResend={onEditResend}
        onInputResponses={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit message" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Edit message" }), {
      target: { value: "Edited prompt" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onEditResend).toHaveBeenCalledWith("Edited prompt");
  });

  it("cancels edit without sending", () => {
    const onEditResend = vi.fn();

    render(
      <AgentMessage
        canEdit
        canRespond={false}
        isStreaming={false}
        message={userMessage}
        onEditResend={onEditResend}
        onInputResponses={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit message" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Edit message" }), {
      target: { value: "Should not send" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onEditResend).not.toHaveBeenCalled();
    expect(screen.getByText("Original prompt")).toBeDefined();
  });
});

const assistantMessage = {
  id: "assistant-1",
  parts: [{ type: "text" as const, text: "Hello from Brain", state: "done" as const }],
  role: "assistant" as const,
  metadata: { status: "complete" as const },
} as EveMessage;

describe("AgentMessage regenerate", () => {
  it("calls onRegenerate for an assistant message", () => {
    const onRegenerate = vi.fn();

    render(
      <AgentMessage
        canRespond={false}
        isStreaming={false}
        message={assistantMessage}
        onInputResponses={vi.fn()}
        onRegenerate={onRegenerate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Regenerate response" }));
    expect(onRegenerate).toHaveBeenCalledOnce();
  });
});

describe("AgentMessage read aloud", () => {
  it("starts and stops speech for an assistant message", () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { cancel, speak },
    });
    class FakeUtterance {
      text: string;
      addEventListener = vi.fn();
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: FakeUtterance,
    });

    render(
      <AgentMessage
        canRespond={false}
        isStreaming={false}
        message={assistantMessage}
        onInputResponses={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Read aloud" }));
    expect(speak).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Stop reading aloud" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Stop reading aloud" }));
    expect(cancel).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Read aloud" })).toBeDefined();
  });
});

describe("AgentMessage more menu", () => {
  it("shows timestamp and copies markdown from the overflow menu", async () => {
    writeText.mockClear();

    render(
      <AgentMessage
        canRespond={false}
        completedAt="2026-08-04T20:27:00.000Z"
        isStreaming={false}
        message={assistantMessage}
        onInputResponses={vi.fn()}
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "More message actions" }));

    await waitFor(() => {
      expect(screen.getByText(/Yesterday,|Today,|Aug/)).toBeDefined();
    });
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy as Markdown" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("Hello from Brain");
    });
  });
});

describe("AgentMessage copy", () => {
  it("copies the message markdown to the clipboard", async () => {
    writeText.mockClear();

    render(
      <AgentMessage
        canRespond={false}
        isStreaming={false}
        message={userMessage}
        onInputResponses={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy message" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("Original prompt");
    });
    expect(screen.getByRole("button", { name: "Copied" })).toBeDefined();
  });

  it("hides copy while an assistant reply is still streaming", () => {
    const streamingAssistant = {
      id: "assistant-streaming",
      parts: [{ type: "text" as const, text: "Partial…", state: "streaming" as const }],
      role: "assistant" as const,
      metadata: { status: "streaming" as const },
    } as EveMessage;

    render(
      <AgentMessage
        canRespond={false}
        isStreaming
        message={streamingAssistant}
        onInputResponses={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Copy message" })).toBeNull();
  });
});
