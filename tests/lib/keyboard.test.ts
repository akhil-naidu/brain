import { describe, expect, it } from "vitest";
import { isNewChatShortcutEvent, newChatShortcutLabel } from "@/lib/chat/keyboard";

describe("isNewChatShortcutEvent", () => {
  it("matches meta/ctrl + shift + o", () => {
    expect(
      isNewChatShortcutEvent({
        key: "o",
        altKey: false,
        ctrlKey: false,
        metaKey: true,
        shiftKey: true,
      }),
    ).toBe(true);
    expect(
      isNewChatShortcutEvent({
        key: "O",
        altKey: false,
        ctrlKey: true,
        metaKey: false,
        shiftKey: true,
      }),
    ).toBe(true);
  });

  it("rejects incomplete or unrelated combinations", () => {
    expect(
      isNewChatShortcutEvent({
        key: "o",
        altKey: false,
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
      }),
    ).toBe(false);
    expect(
      isNewChatShortcutEvent({
        key: "n",
        altKey: false,
        ctrlKey: false,
        metaKey: true,
        shiftKey: true,
      }),
    ).toBe(false);
    expect(
      isNewChatShortcutEvent({
        key: "o",
        altKey: true,
        ctrlKey: false,
        metaKey: true,
        shiftKey: true,
      }),
    ).toBe(false);
  });
});

describe("newChatShortcutLabel", () => {
  it("uses mac-style glyphs on mac platforms", () => {
    expect(newChatShortcutLabel("MacIntel")).toBe("⌘⇧O");
    expect(newChatShortcutLabel("Win32")).toBe("Ctrl+Shift+O");
  });
});
