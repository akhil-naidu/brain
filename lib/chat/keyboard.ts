export type ShortcutKeyEvent = {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
};

function shortcutKey(event: ShortcutKeyEvent): string {
  return typeof event.key === "string" ? event.key.toLowerCase() : "";
}

/** ⌘/Ctrl+Shift+O — start a new chat. */
export function isNewChatShortcutEvent(event: ShortcutKeyEvent): boolean {
  if (shortcutKey(event) !== "o") {
    return false;
  }
  if (!event.shiftKey || event.altKey) {
    return false;
  }
  return event.metaKey || event.ctrlKey;
}

export function newChatShortcutLabel(platform = getPlatform()): string {
  return platform.toLowerCase().includes("mac") ? "⌘⇧O" : "Ctrl+Shift+O";
}

/** ⌘/Ctrl+K — focus sidebar chat search. */
export function isFocusChatSearchShortcutEvent(event: ShortcutKeyEvent): boolean {
  if (shortcutKey(event) !== "k") {
    return false;
  }
  if (event.shiftKey || event.altKey) {
    return false;
  }
  return event.metaKey || event.ctrlKey;
}

/**
 * Bare `/` focuses search when the user is not already typing in an editable field.
 */
export function isSlashFocusChatSearchEvent(
  event: ShortcutKeyEvent & { readonly target?: EventTarget | null },
): boolean {
  if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
    return false;
  }
  return !isEditableKeyboardTarget(event.target);
}

export function focusChatSearchShortcutLabel(platform = getPlatform()): string {
  return platform.toLowerCase().includes("mac") ? "⌘K" : "Ctrl+K";
}

/** ⌘/Ctrl+B — toggle the chat sidebar. */
export function isToggleSidebarShortcutEvent(event: ShortcutKeyEvent): boolean {
  if (shortcutKey(event) !== "b") {
    return false;
  }
  if (event.shiftKey || event.altKey) {
    return false;
  }
  return event.metaKey || event.ctrlKey;
}

export function toggleSidebarShortcutLabel(platform = getPlatform()): string {
  return platform.toLowerCase().includes("mac") ? "⌘B" : "Ctrl+B";
}

export function isEditableKeyboardTarget(target: EventTarget | null | undefined): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function getPlatform(): string {
  if (typeof navigator === "undefined") {
    return "";
  }
  return navigator.platform.toLowerCase();
}
