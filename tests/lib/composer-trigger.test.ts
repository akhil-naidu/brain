import { describe, expect, it } from "vitest";
import { applyComposerTriggerReplacement, findComposerTrigger } from "@/lib/chat/composer-trigger";

describe("findComposerTrigger", () => {
  it("detects a trailing @ mention query", () => {
    expect(findComposerTrigger("hello @cli", 10)).toEqual({
      kind: "@",
      query: "cli",
      start: 6,
      end: 10,
    });
  });

  it("detects a slash command at the start", () => {
    expect(findComposerTrigger("/play", 5)).toEqual({
      kind: "/",
      query: "play",
      start: 0,
      end: 5,
    });
  });

  it("returns null when the caret is not in a trigger token", () => {
    expect(findComposerTrigger("hello world", 11)).toBeNull();
    expect(findComposerTrigger("email@x.com", 11)).toBeNull();
  });
});

describe("applyComposerTriggerReplacement", () => {
  it("replaces the trigger range", () => {
    expect(
      applyComposerTriggerReplacement(
        "ask @cli",
        { kind: "@", query: "cli", start: 4, end: 8 },
        "@ClickUp ",
      ),
    ).toEqual({
      value: "ask @ClickUp ",
      caret: 13,
    });
  });
});
