import { describe, expect, it } from "vitest";
import {
  focusChatSearchShortcutLabel,
  isEditableKeyboardTarget,
  isFocusChatSearchShortcutEvent,
  isNewChatShortcutEvent,
  isSlashFocusChatSearchEvent,
  isToggleSidebarShortcutEvent,
  newChatShortcutLabel,
  toggleSidebarShortcutLabel,
} from "@/lib/chat/keyboard";

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

  it("ignores events with an empty key", () => {
    expect(
      isNewChatShortcutEvent({
        key: "",
        altKey: false,
        ctrlKey: false,
        metaKey: true,
        shiftKey: true,
      }),
    ).toBe(false);
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

describe("isFocusChatSearchShortcutEvent", () => {
  it("matches meta/ctrl + k", () => {
    expect(
      isFocusChatSearchShortcutEvent({
        key: "k",
        altKey: false,
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
      }),
    ).toBe(true);
    expect(
      isFocusChatSearchShortcutEvent({
        key: "K",
        altKey: false,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBe(true);
  });

  it("rejects shifted or incomplete combinations", () => {
    expect(
      isFocusChatSearchShortcutEvent({
        key: "k",
        altKey: false,
        ctrlKey: false,
        metaKey: true,
        shiftKey: true,
      }),
    ).toBe(false);
  });
});

describe("isSlashFocusChatSearchEvent", () => {
  it("matches bare slash outside editable fields", () => {
    expect(
      isSlashFocusChatSearchEvent({
        key: "/",
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        target: document.body,
      }),
    ).toBe(true);
  });

  it("ignores slash while typing in an input", () => {
    const input = document.createElement("input");
    expect(
      isSlashFocusChatSearchEvent({
        key: "/",
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        target: input,
      }),
    ).toBe(false);
    expect(isEditableKeyboardTarget(input)).toBe(true);
  });
});

describe("focusChatSearchShortcutLabel", () => {
  it("uses mac-style glyphs on mac platforms", () => {
    expect(focusChatSearchShortcutLabel("MacIntel")).toBe("⌘K");
    expect(focusChatSearchShortcutLabel("Win32")).toBe("Ctrl+K");
  });
});

describe("isToggleSidebarShortcutEvent", () => {
  it("matches meta/ctrl + b", () => {
    expect(
      isToggleSidebarShortcutEvent({
        key: "b",
        altKey: false,
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
      }),
    ).toBe(true);
    expect(
      isToggleSidebarShortcutEvent({
        key: "B",
        altKey: false,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBe(true);
  });

  it("rejects shifted combinations", () => {
    expect(
      isToggleSidebarShortcutEvent({
        key: "b",
        altKey: false,
        ctrlKey: false,
        metaKey: true,
        shiftKey: true,
      }),
    ).toBe(false);
  });
});

describe("toggleSidebarShortcutLabel", () => {
  it("uses mac-style glyphs on mac platforms", () => {
    expect(toggleSidebarShortcutLabel("MacIntel")).toBe("⌘B");
    expect(toggleSidebarShortcutLabel("Win32")).toBe("Ctrl+B");
  });
});
