import { describe, expect, it } from "vitest";

import { countGraphemes, truncateGraphemes } from "@/lib/text";

describe("countGraphemes", () => {
  it("counts ASCII as one per character", () => {
    expect(countGraphemes("hello")).toBe(5);
  });

  it("counts an empty string as zero", () => {
    expect(countGraphemes("")).toBe(0);
  });

  it("counts a surrogate pair emoji as one", () => {
    // "\u{1F600}" is two UTF-16 code units.
    expect("\u{1F600}".length).toBe(2);
    expect(countGraphemes("\u{1F600}")).toBe(1);
  });

  it("counts a flag emoji as one", () => {
    // Regional indicator pair: four UTF-16 code units, two code points.
    const flag = "\u{1F1EE}\u{1F1F3}";
    expect(flag.length).toBe(4);
    expect(Array.from(flag)).toHaveLength(2);
    expect(countGraphemes(flag)).toBe(1);
  });

  it("counts a ZWJ family emoji as one", () => {
    const family = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}";
    expect(countGraphemes(family)).toBe(1);
  });

  it("counts a combining accent as one", () => {
    const combined = "e\u0301";
    expect(combined.length).toBe(2);
    expect(countGraphemes(combined)).toBe(1);
  });
});

describe("truncateGraphemes", () => {
  it("returns the input when it is already short enough", () => {
    expect(truncateGraphemes("hello", 5)).toBe("hello");
    expect(truncateGraphemes("hello", 10)).toBe("hello");
  });

  it("truncates ASCII to the limit", () => {
    expect(truncateGraphemes("hello world", 5)).toBe("hello");
  });

  it("returns an empty string for a non-positive limit", () => {
    expect(truncateGraphemes("hello", 0)).toBe("");
    expect(truncateGraphemes("hello", -1)).toBe("");
  });

  it("never splits a surrogate pair into a lone half", () => {
    const emoji = "\u{1F600}\u{1F600}\u{1F600}";
    const truncated = truncateGraphemes(emoji, 2);

    expect(countGraphemes(truncated)).toBe(2);
    expect(truncated).toBe("\u{1F600}\u{1F600}");
    expect(truncated).not.toContain("\uFFFD");
  });

  it("keeps a ZWJ sequence intact rather than truncating inside it", () => {
    const family = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}";
    const text = `${family}${family}`;

    expect(truncateGraphemes(text, 1)).toBe(family);
  });

  it("does not emit a trailing zero-width joiner", () => {
    const family = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}";

    expect(truncateGraphemes(family, 1).endsWith("\u200D")).toBe(false);
  });
});
