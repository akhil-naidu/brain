import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { EveAuthorizationPart, EveDynamicToolPart } from "eve/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatComposer } from "@/components/chat/composer";
import {
  AuthorizationPart,
  getSafeExternalUrl,
} from "@/components/chat/message-parts/authorization-part";
import {
  getToolGroupKey,
  getToolStatusFromState,
  toolStatusLabel,
} from "@/components/chat/tool-calls/tool-state";
import {
  formatPayload,
  MAX_FORMATTED_PAYLOAD_LENGTH,
} from "@/components/chat/tool-calls/payload-format";
import { ToolDetails } from "@/components/chat/tool-calls/tool-details";

afterEach(cleanup);

const authorizationPart: EveAuthorizationPart = {
  authorization: {
    instructions: "Follow the provider instructions.",
    url: "https://example.com/connect",
  },
  description: "Authorize this connection",
  displayName: "Example",
  name: "example",
  state: "required",
  stepIndex: 0,
  turnId: "turn-1",
  type: "authorization",
};
const executableUrl = ["java", "script:alert(1)"].join("");
const inputRequestPart: EveDynamicToolPart = {
  input: {},
  state: "input-available",
  toolCallId: "call-input",
  toolMetadata: {
    eve: {
      inputRequest: {
        allowFreeform: true,
        options: [{ id: "approve", label: "Approve" }],
        prompt: "Continue?",
        requestId: "request-1",
      },
      kind: "tool-call",
      name: "request_input",
    },
  },
  toolName: "request_input",
  type: "dynamic-tool",
};

describe("authorization links", () => {
  it.each([executableUrl, "data:text/html,boom", "not a url"])(
    "does not link an unsafe URL: %s",
    (url) => {
      expect(getSafeExternalUrl(url)).toBeNull();

      render(
        <AuthorizationPart
          part={{
            ...authorizationPart,
            authorization: { ...authorizationPart.authorization, url },
          }}
        />,
      );

      expect(screen.queryByRole("link", { name: /connect/i })).toBeNull();
      expect(screen.getByText(url)).toBeTruthy();
    },
  );

  it.each(["http://localhost:3000/connect", "https://example.com/connect"])(
    "links an allowed URL: %s",
    (url) => {
      expect(getSafeExternalUrl(url)).toBe(url);

      render(
        <AuthorizationPart
          part={{
            ...authorizationPart,
            authorization: { ...authorizationPart.authorization, url },
          }}
        />,
      );

      expect(screen.getByRole("link", { name: /connect/i }).getAttribute("href")).toBe(url);
    },
  );
});

describe("tool helpers", () => {
  it("keeps a tool-group key stable when a call is appended", () => {
    const first = [{ toolCallId: "call-a" }];
    const appended = [...first, { toolCallId: "call-b" }];

    expect(getToolGroupKey(first)).toBe(getToolGroupKey(appended));
  });

  it("covers terminal and settled tool statuses", () => {
    expect(getToolStatusFromState("output-available", false)).toBe("completed");
    expect(getToolStatusFromState("output-error", false)).toBe("error");
    expect(getToolStatusFromState("output-denied", false)).toBe("denied");
    expect(toolStatusLabel("completed")).toBe("Complete");
    expect(toolStatusLabel("incomplete")).toBe("Incomplete");
  });
});

describe("formatPayload", () => {
  it("caps deeply nested and long payload output", () => {
    const payload = {
      entries: Array.from({ length: 1_000 }, (_, index) => ({
        index,
        value: "x".repeat(1_000),
      })),
    };

    const formatted = formatPayload(payload);

    expect(formatted.length).toBeLessThanOrEqual(MAX_FORMATTED_PAYLOAD_LENGTH);
    expect(formatted).toContain("truncated");
  });
});

describe("tool input responses", () => {
  it("allows only one response while submission is in flight", () => {
    const pending = Promise.withResolvers<void>();
    const onInputResponses = vi.fn(() => pending.promise);
    render(<ToolDetails canRespond onInputResponses={onInputResponses} part={inputRequestPart} />);
    const approve = screen.getByRole("button", { name: "Approve" });

    fireEvent.click(approve);
    fireEvent.click(approve);

    expect(onInputResponses).toHaveBeenCalledTimes(1);
    pending.resolve();
  });

  it("retains freeform input and surfaces rejected submissions", async () => {
    const onInputResponses = vi.fn(async () => {
      throw new Error("Connection lost");
    });
    render(<ToolDetails canRespond onInputResponses={onInputResponses} part={inputRequestPart} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Response to Continue?" }), {
      target: { value: "Keep this response" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Connection lost");
    expect(screen.getByDisplayValue("Keep this response")).toBeTruthy();
  });
});

function ComposerHarness({
  maxLength,
  onSubmit,
}: {
  readonly maxLength: number;
  readonly onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <ChatComposer
      autoFocus={false}
      maxLength={maxLength}
      onChange={setValue}
      onStop={() => undefined}
      onSubmit={onSubmit}
      value={value}
    />
  );
}

describe("ChatComposer submit guard", () => {
  it("does not submit Enter while an IME composition is active", () => {
    const onSubmit = vi.fn();
    render(<ComposerHarness maxLength={10} onSubmit={onSubmit} />);
    const textarea = screen.getByRole("textbox", { name: "Message Brain" });

    fireEvent.change(textarea, { target: { value: "日本" } });
    fireEvent.keyDown(textarea, { isComposing: true, key: "Enter" });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("counts emoji as one grapheme and blocks only over-limit input", () => {
    const onSubmit = vi.fn();
    render(<ComposerHarness maxLength={1} onSubmit={onSubmit} />);
    const textarea = screen.getByRole("textbox", { name: "Message Brain" });

    fireEvent.change(textarea, { target: { value: "😀" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).toHaveBeenLastCalledWith("😀");

    fireEvent.change(textarea, { target: { value: "😀😀" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
