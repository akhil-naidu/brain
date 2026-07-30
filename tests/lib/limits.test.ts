import { describe, expect, it } from "vitest";

import {
  assertChatMessageLength,
  getChatMessageLength,
  getChatMessageLengthError,
  MAX_CHAT_MESSAGE_CHARS,
} from "@/lib/chat/limits";

describe("getChatMessageLength", () => {
  it("counts ASCII by character", () => {
    expect(getChatMessageLength("hello")).toBe(5);
  });

  it("counts an emoji as one, not as its UTF-16 length", () => {
    expect(getChatMessageLength("\u{1F600}")).toBe(1);
  });
});

describe("getChatMessageLengthError", () => {
  it("accepts a message at exactly the limit", () => {
    expect(getChatMessageLengthError("a".repeat(MAX_CHAT_MESSAGE_CHARS))).toBeNull();
  });

  it("rejects a message one over the limit", () => {
    expect(getChatMessageLengthError("a".repeat(MAX_CHAT_MESSAGE_CHARS + 1))).not.toBeNull();
  });

  it("ignores surrounding whitespace when measuring", () => {
    const padded = `   ${"a".repeat(MAX_CHAT_MESSAGE_CHARS)}   `;

    expect(getChatMessageLengthError(padded)).toBeNull();
  });

  it("allows emoji up to the grapheme limit even though UTF-16 length is larger", () => {
    const emoji = "\u{1F600}".repeat(MAX_CHAT_MESSAGE_CHARS);

    expect(emoji.length).toBeGreaterThan(MAX_CHAT_MESSAGE_CHARS);
    expect(getChatMessageLengthError(emoji)).toBeNull();
  });

  it("formats the limit deterministically regardless of host locale", () => {
    expect(getChatMessageLengthError("a".repeat(MAX_CHAT_MESSAGE_CHARS + 1))).toBe(
      "Messages must be 8,000 characters or fewer.",
    );
  });
});

describe("assertChatMessageLength", () => {
  it("does not throw for an acceptable message", () => {
    expect(() => assertChatMessageLength("hello")).not.toThrow();
  });

  it("throws for an over-long message", () => {
    expect(() => assertChatMessageLength("a".repeat(MAX_CHAT_MESSAGE_CHARS + 1))).toThrow(
      /8,000 characters or fewer/,
    );
  });
});
