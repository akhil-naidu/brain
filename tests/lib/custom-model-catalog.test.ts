import { describe, expect, it, vi } from "vitest";
import { DEFAULT_BRAIN_CHAT_MODEL_ID } from "@/agent/lib/models";
import { defaultCatalogModelId } from "@/lib/chat/custom-models/catalog-shared";
import {
  customModelSelectableId,
  isCustomModelSelectableId,
  parseCustomModelRowId,
} from "@/lib/chat/custom-models/ids";

vi.mock("@/lib/chat/custom-models/store", () => ({
  getCustomModelStore: () => ({
    listVisibleModels: async () => [
      {
        id: "11111111-1111-4111-8111-111111111111",
        scope: "workspace",
        workspaceId: "ws-1",
        label: "Local",
        description: "",
        baseUrl: "http://127.0.0.1:11434/v1",
        providerModelId: "llama3.2",
        contextWindowTokens: 8192,
        hasApiKey: false,
        createdAt: "",
        updatedAt: "",
      },
    ],
    listDisabledModelIds: async () => [],
  }),
}));

import { buildMergedModelCatalog } from "@/lib/chat/custom-models/catalog";

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

  it("omits disabled built-in models from the merged catalog", async () => {
    const catalog = await buildMergedModelCatalog({
      workspaceId: "ws-1",
      includeCurated: true,
      disabledBuiltinModelIds: [DEFAULT_BRAIN_CHAT_MODEL_ID],
      env: {},
    });
    expect(catalog.some((model) => model.id === DEFAULT_BRAIN_CHAT_MODEL_ID)).toBe(false);
    expect(catalog.some((model) => model.id === "deepseek/deepseek-v4-flash")).toBe(true);
  });

  it("omits disabled custom models from the merged catalog", async () => {
    const rowId = "11111111-1111-4111-8111-111111111111";
    const catalog = await buildMergedModelCatalog({
      workspaceId: "ws-1",
      includeCurated: false,
      disabledBuiltinModelIds: [],
      disabledCustomModelIds: [rowId],
      env: {},
    });
    expect(catalog.some((model) => model.id === `custom:${rowId}`)).toBe(false);
  });
});
