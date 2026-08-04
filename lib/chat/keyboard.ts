export type ShortcutKeyEvent = {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
};

/** ⌘/Ctrl+Shift+O — start a new chat. */
export function isNewChatShortcutEvent(event: ShortcutKeyEvent): boolean {
  if (event.key.toLowerCase() !== "o") {
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

function getPlatform(): string {
  if (typeof navigator === "undefined") {
    return "";
  }
  return navigator.platform.toLowerCase();
}
