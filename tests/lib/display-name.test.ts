import { describe, expect, it } from "vitest";
import { DISPLAY_NAME_MAX_LENGTH, parseDisplayName } from "@/lib/auth/display-name";

describe("parseDisplayName", () => {
  it("trims and collapses whitespace", () => {
    expect(parseDisplayName("  Ada   Lovelace  ")).toBe("Ada Lovelace");
  });

  it("rejects empty or oversized names", () => {
    expect(parseDisplayName("")).toBeNull();
    expect(parseDisplayName("   ")).toBeNull();
    expect(parseDisplayName(null)).toBeNull();
    expect(parseDisplayName("a".repeat(DISPLAY_NAME_MAX_LENGTH + 1))).toBeNull();
    expect(parseDisplayName("a".repeat(DISPLAY_NAME_MAX_LENGTH))).toBe(
      "a".repeat(DISPLAY_NAME_MAX_LENGTH),
    );
  });
});
