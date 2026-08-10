import type { ComposerCommandItem } from "@/lib/chat/composer-commands";
import {
  connectionIdFromMentionItemId,
  createConnectionIconElement,
} from "@/lib/chat/connection-icon-element";
import type { ComposerTrigger } from "@/lib/chat/composer-trigger";

export const COMPOSER_MENTION_ATTR = "data-composer-mention";
export const COMPOSER_MENTION_LABEL_ATTR = "data-composer-mention-label";
export const COMPOSER_MENTION_REMOVE_ATTR = "data-composer-mention-remove";

const SVG_NS = "http://www.w3.org/2000/svg";

export type InlineMentionInsert = {
  readonly itemId: string;
  readonly kind: ComposerCommandItem["kind"];
  readonly label: string;
  readonly mentionText: string;
};

export type ComposerEditorPart =
  | { readonly type: "text"; readonly value: string }
  | {
      readonly type: "mention";
      readonly itemId: string;
      readonly kind: ComposerCommandItem["kind"];
      readonly label: string;
      readonly mentionText: string;
    };

function asHtmlElement(node: Node): HTMLElement | null {
  return node instanceof HTMLElement ? node : null;
}

function isMentionElement(node: Node): boolean {
  const el = asHtmlElement(node);
  return el != null && el.hasAttribute(COMPOSER_MENTION_ATTR);
}

function parseMentionKind(value: string | null): ComposerCommandItem["kind"] {
  if (
    value === "project" ||
    value === "playbook" ||
    value === "schedule" ||
    value === "connection"
  ) {
    return value;
  }
  return "connection";
}

function childNodesOf(el: HTMLElement): Node[] {
  const out: Node[] = [];
  for (let index = 0; index < el.childNodes.length; index += 1) {
    const child = el.childNodes.item(index);
    if (child) {
      out.push(child);
    }
  }
  return out;
}

function createSvgIcon(documentRef: Document, paths: readonly string[]): SVGSVGElement {
  const svg = documentRef.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("class", "size-3 shrink-0 opacity-80");
  for (const d of paths) {
    const path = documentRef.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }
  return svg;
}

function mentionKindIconPaths(kind: ComposerCommandItem["kind"]): readonly string[] {
  if (kind === "project") {
    return [
      "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
    ];
  }
  if (kind === "playbook") {
    return ["m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"];
  }
  if (kind === "schedule") {
    return [
      "M8 2v4",
      "M16 2v4",
      "M3 10h18",
      "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
      "M16 14v2.2l1.6 1",
    ];
  }
  return ["M12 22v-5", "M9 8V2", "M15 8V2", "M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"];
}

function mentionLabelFromElement(el: HTMLElement): string {
  const labeled = el.querySelector(`[${COMPOSER_MENTION_LABEL_ATTR}]`);
  const fromLabel = labeled?.textContent?.trim();
  if (fromLabel) {
    return fromLabel;
  }
  const fromData = el.dataset.mentionLabel?.trim();
  if (fromData) {
    return fromData;
  }
  return "";
}

export function createComposerMentionElement(
  documentRef: Document,
  mention: InlineMentionInsert,
): HTMLSpanElement {
  const span = documentRef.createElement("span");
  span.contentEditable = "false";
  span.setAttribute(COMPOSER_MENTION_ATTR, mention.kind);
  span.dataset.mentionId = mention.itemId;
  span.dataset.mentionText = mention.mentionText.trim();
  span.dataset.mentionLabel = mention.label;
  span.dataset.composerMentionBadge = "";
  span.className =
    "mx-0.5 inline-flex max-w-[16rem] items-center gap-1 rounded-md border border-teal-500/35 bg-teal-500/10 py-0.5 pr-0.5 pl-1.5 align-baseline text-xs font-medium leading-5 text-teal-700 dark:border-teal-400/40 dark:bg-teal-400/10 dark:text-teal-300";

  const connectionId =
    mention.kind === "connection" ? connectionIdFromMentionItemId(mention.itemId) : null;
  const brandIcon =
    connectionId != null
      ? createConnectionIconElement(documentRef, connectionId, "size-3 shrink-0")
      : null;
  span.appendChild(brandIcon ?? createSvgIcon(documentRef, mentionKindIconPaths(mention.kind)));

  const label = documentRef.createElement("span");
  label.setAttribute(COMPOSER_MENTION_LABEL_ATTR, "");
  label.className = "min-w-0 truncate";
  label.textContent = mention.label;
  span.appendChild(label);

  const remove = documentRef.createElement("button");
  remove.type = "button";
  remove.setAttribute(COMPOSER_MENTION_REMOVE_ATTR, "");
  remove.setAttribute("aria-label", `Remove ${mention.label}`);
  remove.tabIndex = -1;
  remove.className =
    "inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-teal-700/80 transition-colors hover:bg-teal-500/15 hover:text-teal-800 dark:text-teal-300/80 dark:hover:bg-teal-400/15 dark:hover:text-teal-200";
  const xIcon = createSvgIcon(documentRef, ["M18 6 6 18", "m6 6 12 12"]);
  xIcon.setAttribute("class", "size-2.5 shrink-0");
  remove.appendChild(xIcon);
  span.appendChild(remove);

  return span;
}

export function partsFromComposerEditor(root: HTMLElement): ComposerEditorPart[] {
  const parts: ComposerEditorPart[] = [];

  const pushText = (value: string) => {
    if (!value) {
      return;
    }
    const last = parts[parts.length - 1];
    if (last?.type === "text") {
      parts[parts.length - 1] = { type: "text", value: `${last.value}${value}` };
      return;
    }
    parts.push({ type: "text", value });
  };

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      pushText(node.textContent ?? "");
      return;
    }
    const el = asHtmlElement(node);
    if (!el) {
      return;
    }
    if (isMentionElement(el)) {
      const label = mentionLabelFromElement(el);
      parts.push({
        type: "mention",
        itemId: el.dataset.mentionId ?? "",
        kind: parseMentionKind(el.getAttribute(COMPOSER_MENTION_ATTR)),
        label,
        mentionText: (el.dataset.mentionText ?? (label ? `@${label}` : "")).trim(),
      });
      return;
    }
    if (el.tagName === "BR") {
      pushText("\n");
      return;
    }
    for (const child of childNodesOf(el)) {
      walk(child);
    }
  };

  walk(root);
  return parts;
}

export function serializeComposerParts(parts: readonly ComposerEditorPart[]): string {
  return parts.map((part) => (part.type === "text" ? part.value : part.mentionText)).join("");
}

export function serializeComposerEditor(root: HTMLElement): string {
  return serializeComposerParts(partsFromComposerEditor(root));
}

function plainLength(part: ComposerEditorPart): number {
  return part.type === "text" ? part.value.length : part.mentionText.length;
}

/** Map a plain-text caret offset onto part index + offset within that part. */
function locatePlainOffset(
  parts: readonly ComposerEditorPart[],
  plainOffset: number,
): { readonly partIndex: number; readonly offsetInPart: number } {
  let remaining = Math.max(0, plainOffset);
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!part) {
      break;
    }
    const length = plainLength(part);
    if (remaining <= length) {
      return { partIndex: index, offsetInPart: remaining };
    }
    remaining -= length;
  }
  const last = parts[parts.length - 1];
  return {
    partIndex: Math.max(0, parts.length - 1),
    offsetInPart: last ? plainLength(last) : 0,
  };
}

export function getComposerTextBeforeCaret(root: HTMLElement): string | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  const anchor = selection.anchorNode;
  if (!anchor || !root.contains(anchor)) {
    return null;
  }

  const range = selection.getRangeAt(0).cloneRange();
  range.selectNodeContents(root);
  range.setEnd(selection.anchorNode, selection.anchorOffset);

  const wrapper = document.createElement("div");
  wrapper.appendChild(range.cloneContents());
  return serializeComposerEditor(wrapper);
}

export function getComposerPlainState(root: HTMLElement): {
  readonly text: string;
  readonly caret: number;
} {
  const text = serializeComposerEditor(root);
  const before = getComposerTextBeforeCaret(root);
  return {
    text,
    caret: before === null ? text.length : before.length,
  };
}

function replacePlainRange(
  parts: readonly ComposerEditorPart[],
  start: number,
  end: number,
  insertion: readonly ComposerEditorPart[],
): ComposerEditorPart[] {
  const next: ComposerEditorPart[] = [];
  const push = (part: ComposerEditorPart) => {
    if (part.type === "text" && part.value.length === 0) {
      return;
    }
    const last = next[next.length - 1];
    if (part.type === "text" && last?.type === "text") {
      next[next.length - 1] = { type: "text", value: `${last.value}${part.value}` };
      return;
    }
    next.push(part);
  };

  let offset = 0;
  let inserted = false;
  for (const part of parts) {
    const length = plainLength(part);
    const partStart = offset;
    const partEnd = offset + length;
    offset = partEnd;

    if (partEnd <= start) {
      push(part);
      continue;
    }
    if (partStart >= end) {
      if (!inserted) {
        for (const item of insertion) {
          push(item);
        }
        inserted = true;
      }
      push(part);
      continue;
    }

    // Overlaps the replaced range.
    if (part.type === "text") {
      const headEnd = Math.max(0, start - partStart);
      const tailStart = Math.max(0, end - partStart);
      push({ type: "text", value: part.value.slice(0, headEnd) });
      if (!inserted) {
        for (const item of insertion) {
          push(item);
        }
        inserted = true;
      }
      push({ type: "text", value: part.value.slice(tailStart) });
      continue;
    }

    // Mention chips are atomic — drop when overlapped.
    if (!inserted && partStart >= start) {
      for (const item of insertion) {
        push(item);
      }
      inserted = true;
    }
  }

  if (!inserted) {
    for (const item of insertion) {
      push(item);
    }
  }

  return next;
}

export function renderComposerParts(root: HTMLElement, parts: readonly ComposerEditorPart[]): void {
  root.innerHTML = "";
  for (const part of parts) {
    if (part.type === "text") {
      // Preserve newlines as <br> between text runs for display; keep \n in text nodes for simplicity.
      root.appendChild(document.createTextNode(part.value));
    } else {
      root.appendChild(
        createComposerMentionElement(document, {
          itemId: part.itemId,
          kind: part.kind,
          label: part.label,
          mentionText: part.mentionText,
        }),
      );
    }
  }
}

function placeCaretAtPlainOffset(root: HTMLElement, plainOffset: number): void {
  const parts = partsFromComposerEditor(root);
  const { partIndex, offsetInPart } = locatePlainOffset(parts, plainOffset);
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  let walked = 0;
  let targetNode: Node | null = null;
  let targetOffset = 0;

  for (const child of childNodesOf(root)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const length = child.textContent?.length ?? 0;
      if (walked + length >= plainOffset) {
        targetNode = child;
        targetOffset = plainOffset - walked;
        break;
      }
      walked += length;
      continue;
    }
    const mention = asHtmlElement(child);
    if (mention && isMentionElement(mention)) {
      const length = (mention.dataset.mentionText ?? "").trim().length;
      if (walked + length >= plainOffset) {
        // Place caret after the mention chip.
        const range = document.createRange();
        range.setStartAfter(mention);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      walked += length;
    }
  }

  if (!targetNode) {
    // Fallback using partIndex walk
    let index = 0;
    for (const child of childNodesOf(root)) {
      if (index === partIndex) {
        if (child.nodeType === Node.TEXT_NODE) {
          targetNode = child;
          targetOffset = offsetInPart;
        } else {
          const range = document.createRange();
          range.setStartAfter(child);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }
        break;
      }
      index += 1;
    }
  }

  const range = document.createRange();
  if (targetNode) {
    range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length ?? 0));
  } else {
    range.selectNodeContents(root);
    range.collapse(false);
  }
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Replace the active `/`/`@` trigger with an inline mention badge in the text. */
export function replaceTriggerWithMentionBadge(
  root: HTMLElement,
  trigger: ComposerTrigger,
  mention: InlineMentionInsert,
): string {
  const parts = partsFromComposerEditor(root);
  const plain = serializeComposerParts(parts);
  const afterChar = plain.slice(trigger.end, trigger.end + 1);
  const needsTrailingSpace = afterChar.length === 0 || !/\s/.test(afterChar);
  const mentionText = mention.mentionText.trim();
  const insertion: ComposerEditorPart[] = [
    {
      type: "mention",
      itemId: mention.itemId,
      kind: mention.kind,
      label: mention.label,
      mentionText,
    },
  ];
  if (needsTrailingSpace) {
    insertion.push({ type: "text", value: " " });
  }
  const nextParts = replacePlainRange(parts, trigger.start, trigger.end, insertion);
  renderComposerParts(root, nextParts);
  const caret = trigger.start + mentionText.length + (needsTrailingSpace ? 1 : 0);
  placeCaretAtPlainOffset(root, caret);
  return serializeComposerParts(nextParts);
}

/** Clear trigger characters only (for navigate/send slash actions). */
export function clearComposerTriggerRange(root: HTMLElement, trigger: ComposerTrigger): string {
  const parts = partsFromComposerEditor(root);
  const nextParts = replacePlainRange(parts, trigger.start, trigger.end, []);
  renderComposerParts(root, nextParts);
  placeCaretAtPlainOffset(root, trigger.start);
  return serializeComposerParts(nextParts);
}

export function clearComposerEditor(root: HTMLElement): void {
  root.innerHTML = "";
}

export function setComposerEditorPlainText(root: HTMLElement, text: string): void {
  root.textContent = text;
  placeCaretAtPlainOffset(root, text.length);
}

export function isComposerEditorEmpty(root: HTMLElement): boolean {
  return (
    serializeComposerEditor(root).trim().length === 0 &&
    root.querySelector(`[${COMPOSER_MENTION_ATTR}]`) === null
  );
}

/** Remove an inline mention chip and place the caret where it was. */
export function removeComposerMentionElement(root: HTMLElement, mentionEl: HTMLElement): string {
  if (!root.contains(mentionEl) || !isMentionElement(mentionEl)) {
    return serializeComposerEditor(root);
  }

  let plainOffset = 0;
  for (const child of childNodesOf(root)) {
    if (child === mentionEl) {
      break;
    }
    if (child.nodeType === Node.TEXT_NODE) {
      plainOffset += child.textContent?.length ?? 0;
      continue;
    }
    const mention = asHtmlElement(child);
    if (mention && isMentionElement(mention)) {
      plainOffset += (mention.dataset.mentionText ?? "").trim().length;
    }
  }

  const mentionLength = (mentionEl.dataset.mentionText ?? "").trim().length;
  const parts = partsFromComposerEditor(root);
  const nextParts = replacePlainRange(parts, plainOffset, plainOffset + mentionLength, []);
  renderComposerParts(root, nextParts);
  placeCaretAtPlainOffset(root, plainOffset);
  return serializeComposerParts(nextParts);
}
