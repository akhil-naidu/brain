import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WelcomePrompts } from "@/components/chat/welcome-prompts";
import { WELCOME_PROMPTS } from "@/lib/chat/welcome-prompts";

afterEach(cleanup);

describe("WelcomePrompts", () => {
  it("sends the selected prompt text", () => {
    const onSelect = vi.fn();
    render(<WelcomePrompts onSelect={onSelect} prompts={WELCOME_PROMPTS} />);

    fireEvent.click(screen.getByRole("button", { name: WELCOME_PROMPTS[0]!.label }));
    expect(onSelect).toHaveBeenCalledWith(WELCOME_PROMPTS[0]!.prompt);
  });
});
