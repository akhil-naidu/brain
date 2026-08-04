import { truncateGraphemes } from "@/lib/text";

export const DEFAULT_CHAT_TITLE = "New chat";

const MAX_TITLE_LENGTH = 72;
const TITLE_ELLIPSIS = "...";

/** Leading block markers only — heading, blockquote, bullet, or ordered list. */
const LEADING_BLOCK_MARKER = /^\s*(?:[#>]+|[-*+]|\d+[.)])\s*/;

export function createFallbackTitle(input: string) {
  const firstLine = input.split("\n").find((line) => line.trim().length > 0) ?? "";

  // Strip only markers that are syntax. Removing `_` or `*` everywhere would
  // mangle legitimate text such as identifiers like `snake_case`.
  const text = firstLine
    .replace(LEADING_BLOCK_MARKER, "")
    .replaceAll("`", "")
    .replace(/\s+/g, " ")
    .trim();

  return normalizeChatTitle(text);
}

/** Normalize a user-edited chat title for persistence. */
export function normalizeChatTitle(input: string) {
  const text = input.replace(/\s+/g, " ").trim();

  if (!text) {
    return DEFAULT_CHAT_TITLE;
  }

  return truncateTitle(text);
}

function truncateTitle(title: string) {
  if (countGraphemesAtMost(title, MAX_TITLE_LENGTH)) {
    return title;
  }

  const head = truncateGraphemes(title, MAX_TITLE_LENGTH - TITLE_ELLIPSIS.length).trimEnd();

  return `${head}${TITLE_ELLIPSIS}`;
}

function countGraphemesAtMost(value: string, limit: number) {
  return truncateGraphemes(value, limit) === value;
}
