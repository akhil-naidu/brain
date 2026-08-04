import type { EveMessage } from "eve/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentMessage } from "@/components/chat/message";

afterEach(cleanup);

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
