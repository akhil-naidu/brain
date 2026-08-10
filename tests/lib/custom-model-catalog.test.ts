import { describe, expect, it } from "vitest";
import { defaultCatalogModelId } from "@/lib/chat/custom-models/catalog-shared";
import {
  customModelSelectableId,
  isCustomModelSelectableId,
  parseCustomModelRowId,
} from "@/lib/chat/custom-models/ids";

describe("custom model catalog helpers", () => {
  it("builds and parses custom selectable ids", () => {
    const rowId = "11111111-1111-4111-8111-111111111111";
    const selectable = customModelSelectableId(rowId);
    expect(selectable).toBe(`custom:${rowId}`);
    expect(isCustomModelSelectableId(selectable)).toBe(true);
    expect(parseCustomModelRowId(selectable)).toBe(rowId);
    expect(parseCustomModelRowId("deepseek/deepseek-v4-pro")).toBeNull();
  });

  it("defaults catalog selection to curated default when present", () => {
    expect(
      defaultCatalogModelId([
        { id: "custom:11111111-1111-4111-8111-111111111111" },
        { id: "deepseek/deepseek-v4-pro" },
      ]),
    ).toBe("deepseek/deepseek-v4-pro");
    expect(defaultCatalogModelId([{ id: "custom:11111111-1111-4111-8111-111111111111" }])).toBe(
      "custom:11111111-1111-4111-8111-111111111111",
    );
  });
});
