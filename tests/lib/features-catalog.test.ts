import { describe, expect, it } from "vitest";
import { FEATURE_SECTIONS } from "@/lib/features/catalog";

describe("FEATURE_SECTIONS", () => {
  it("covers the main product areas", () => {
    expect(FEATURE_SECTIONS.map((section) => section.id)).toEqual([
      "chat",
      "connections",
      "models",
      "keyboard",
      "runtime",
    ]);
    expect(
      FEATURE_SECTIONS.some((section) => section.items.some((item) => item.id === "dflow")),
    ).toBe(true);
    for (const section of FEATURE_SECTIONS) {
      expect(section.items.length).toBeGreaterThan(0);
      for (const item of section.items) {
        expect(item.title.trim().length).toBeGreaterThan(0);
        expect(item.summary.trim().length).toBeGreaterThan(10);
      }
    }
  });
});
