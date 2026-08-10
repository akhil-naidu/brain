export type ComposerTriggerKind = "/" | "@";

export type ComposerTrigger = {
  readonly kind: ComposerTriggerKind;
  readonly query: string;
  readonly start: number;
  readonly end: number;
};

/** Find an active `/` or `@` token ending at the caret. */
export function findComposerTrigger(value: string, caret: number): ComposerTrigger | null {
  if (caret < 0 || caret > value.length) {
    return null;
  }
  const before = value.slice(0, caret);
  const match = /(?:^|[\s\n])([/@])([^\s/@]*)$/.exec(before);
  if (!match || match.index === undefined) {
    return null;
  }
  const symbol = match[1];
  if (symbol !== "/" && symbol !== "@") {
    return null;
  }
  const query = match[2] ?? "";
  const start = match.index + (match[0].startsWith(symbol) ? 0 : 1);
  return {
    kind: symbol,
    query,
    start,
    end: caret,
  };
}

/** Replace the active trigger range with `replacement` (usually includes trailing space). */
export function applyComposerTriggerReplacement(
  value: string,
  trigger: ComposerTrigger,
  replacement: string,
): { readonly value: string; readonly caret: number } {
  const next = `${value.slice(0, trigger.start)}${replacement}${value.slice(trigger.end)}`;
  return {
    value: next,
    caret: trigger.start + replacement.length,
  };
}
