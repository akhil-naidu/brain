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
    const assistantMessage = {
      id: "assistant-1",
      parts: [{ type: "text" as const, text: "Partial…", state: "streaming" as const }],
      role: "assistant" as const,
      metadata: { status: "streaming" as const },
    } as EveMessage;

    render(
      <AgentMessage
        canRespond={false}
        isStreaming
        message={assistantMessage}
        onInputResponses={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Copy message" })).toBeNull();
  });
});
