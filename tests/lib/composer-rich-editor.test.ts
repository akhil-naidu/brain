import { describe, expect, it } from "vitest";
import {
  COMPOSER_MENTION_LABEL_ATTR,
  COMPOSER_MENTION_REMOVE_ATTR,
  partsFromComposerEditor,
  removeComposerMentionElement,
  replaceTriggerWithMentionBadge,
  serializeComposerParts,
} from "@/lib/chat/composer-rich-editor";
import { findComposerTrigger } from "@/lib/chat/composer-trigger";

describe("composer rich editor", () => {
  it("replaces an @ trigger with an inline mention mid-sentence", () => {
    const root = document.createElement("div");
    root.textContent = "I @cli want this";
    const trigger = findComposerTrigger("I @cli want this", 6);
    expect(trigger).toEqual({
      kind: "@",
      query: "cli",
      start: 2,
      end: 6,
    });

    const next = replaceTriggerWithMentionBadge(root, trigger!, {
      itemId: "connection:clickup",
      kind: "connection",
      label: "ClickUp",
      mentionText: "@ClickUp",
    });

    expect(next).toBe("I @ClickUp want this");
    const parts = partsFromComposerEditor(root);
    expect(parts).toEqual([
      { type: "text", value: "I " },
      {
        type: "mention",
        itemId: "connection:clickup",
        kind: "connection",
        label: "ClickUp",
        mentionText: "@ClickUp",
      },
      { type: "text", value: " want this" },
    ]);
    expect(serializeComposerParts(parts)).toBe("I @ClickUp want this");

    const badge = root.querySelector("[data-composer-mention]");
    expect(badge?.querySelector("svg")).toBeTruthy();
    expect(badge?.querySelector('path[fill="#7B68EE"]')).toBeTruthy();
    expect(badge?.querySelector(`[${COMPOSER_MENTION_LABEL_ATTR}]`)?.textContent).toBe("ClickUp");
    expect(badge?.querySelector(`[${COMPOSER_MENTION_REMOVE_ATTR}]`)).toBeTruthy();
  });

  it("removes a mention chip via the x control", () => {
    const root = document.createElement("div");
    root.textContent = "I @cli want this";
    const trigger = findComposerTrigger("I @cli want this", 6);
    replaceTriggerWithMentionBadge(root, trigger!, {
      itemId: "connection:clickup",
      kind: "connection",
      label: "ClickUp",
      mentionText: "@ClickUp",
    });

    const badge = root.querySelector("[data-composer-mention]");
    if (!(badge instanceof HTMLElement)) {
      throw new Error("expected mention badge element");
    }
    const next = removeComposerMentionElement(root, badge);
    expect(next).toBe("I  want this");
    expect(root.querySelector("[data-composer-mention]")).toBeNull();
  });
});
