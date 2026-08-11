import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChatModePicker } from "@/components/chat/chat-mode-picker";

afterEach(() => {
  cleanup();
});

describe("ChatModePicker", () => {
  it("renders Ask with mode accent attributes", () => {
    render(<ChatModePicker mode="ask" onModeChange={() => undefined} />);
    const trigger = screen.getByRole("combobox", { name: "Chat mode" });
    expect(trigger.getAttribute("data-chat-mode")).toBe("ask");
    expect(trigger.className).toContain("brain-mode-ask");
  });

  it("renders Plan accent on the trigger", () => {
    render(<ChatModePicker mode="plan" onModeChange={() => undefined} />);
    const trigger = screen.getByRole("combobox", { name: "Chat mode" });
    expect(trigger.getAttribute("data-chat-mode")).toBe("plan");
    expect(trigger.className).toContain("brain-mode-plan");
  });

  it("renders Debug accent on the trigger", () => {
    render(<ChatModePicker mode="debug" onModeChange={() => undefined} />);
    const trigger = screen.getByRole("combobox", { name: "Chat mode" });
    expect(trigger.getAttribute("data-chat-mode")).toBe("debug");
    expect(trigger.className).toContain("brain-mode-debug");
  });
});
