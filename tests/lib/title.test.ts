import { describe, expect, it } from "vitest";

import { countGraphemes } from "@/lib/text";
import { createFallbackTitle, DEFAULT_CHAT_TITLE, normalizeChatTitle } from "@/lib/chat/title";

describe("createFallbackTitle", () => {
  it("uses the message text as the title", () => {
    expect(createFallbackTitle("Refactor the auth module")).toBe("Refactor the auth module");
  });

  it("falls back to the default for empty or whitespace-only input", () => {
    expect(createFallbackTitle("")).toBe(DEFAULT_CHAT_TITLE);
    expect(createFallbackTitle("   \n\t  ")).toBe(DEFAULT_CHAT_TITLE);
  });

  it("collapses runs of whitespace", () => {
    expect(createFallbackTitle("too    many     spaces")).toBe("too many spaces");
  });

  it("uses the first non-empty line", () => {
    expect(createFallbackTitle("\n\nFirst real line\nSecond line")).toBe("First real line");
  });

  it("strips leading markdown block markers", () => {
    expect(createFallbackTitle("# Heading title")).toBe("Heading title");
    expect(createFallbackTitle("> quoted title")).toBe("quoted title");
    expect(createFallbackTitle("- bullet title")).toBe("bullet title");
    expect(createFallbackTitle("1. ordered title")).toBe("ordered title");
  });

  it("preserves underscores and asterisks inside words", () => {
    expect(createFallbackTitle("rename snake_case to camelCase")).toBe(
      "rename snake_case to camelCase",
    );
    expect(createFallbackTitle("what does 2 * 3 equal")).toBe("what does 2 * 3 equal");
  });

  it("truncates long titles to 72 graphemes including the ellipsis", () => {
    const title = createFallbackTitle("a".repeat(200));

    expect(countGraphemes(title)).toBeLessThanOrEqual(72);
    expect(title.endsWith("...")).toBe(true);
  });

  it("does not truncate a title that is exactly at the limit", () => {
    const exact = "a".repeat(72);

    expect(createFallbackTitle(exact)).toBe(exact);
  });

  it("does not split an emoji when truncating", () => {
    const title = createFallbackTitle("\u{1F600}".repeat(200));

    expect(title).not.toContain("\uFFFD");
    expect(countGraphemes(title)).toBeLessThanOrEqual(72);
  });
});

describe("normalizeChatTitle", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeChatTitle("  Hello   world  ")).toBe("Hello world");
  });

  it("falls back to the default for blank input", () => {
    expect(normalizeChatTitle("")).toBe(DEFAULT_CHAT_TITLE);
    expect(normalizeChatTitle("   ")).toBe(DEFAULT_CHAT_TITLE);
  });

  it("truncates long titles", () => {
    const title = normalizeChatTitle("a".repeat(200));
    expect(countGraphemes(title)).toBeLessThanOrEqual(72);
    expect(title.endsWith("...")).toBe(true);
  });
});
