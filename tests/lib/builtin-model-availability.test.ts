import { describe, expect, it } from "vitest";
import { DEFAULT_BRAIN_CHAT_MODEL_ID } from "@/agent/lib/models";
import {
  builtinModelsWithAvailability,
  firstEnabledBuiltinModelId,
  isBuiltinModelEnabled,
} from "@/lib/chat/builtin-models/availability";

describe("builtin model availability", () => {
  it("treats every curated model as enabled when nothing is disabled", () => {
    const models = builtinModelsWithAvailability([]);
    expect(models.length).toBeGreaterThanOrEqual(6);
    expect(models.every((model) => model.enabled)).toBe(true);
    expect(isBuiltinModelEnabled(DEFAULT_BRAIN_CHAT_MODEL_ID, [])).toBe(true);
    expect(firstEnabledBuiltinModelId([])).toBe(DEFAULT_BRAIN_CHAT_MODEL_ID);
  });

  it("marks listed ids as disabled and skips them for fallback", () => {
    const disabled = [DEFAULT_BRAIN_CHAT_MODEL_ID, "gpt-5.4-mini"];
    const models = builtinModelsWithAvailability(disabled);
    expect(models.find((model) => model.id === DEFAULT_BRAIN_CHAT_MODEL_ID)?.enabled).toBe(false);
    expect(models.find((model) => model.id === "gpt-5.4-mini")?.enabled).toBe(false);
    expect(models.find((model) => model.id === "deepseek/deepseek-v4-flash")?.enabled).toBe(true);
    expect(isBuiltinModelEnabled(DEFAULT_BRAIN_CHAT_MODEL_ID, disabled)).toBe(false);
    expect(isBuiltinModelEnabled("deepseek/deepseek-v4-flash", disabled)).toBe(true);
    expect(firstEnabledBuiltinModelId(disabled)).toBe("deepseek/deepseek-v4-flash");
  });

  it("returns no fallback when every curated model is disabled", () => {
    const allIds = builtinModelsWithAvailability([]).map((model) => model.id);
    expect(firstEnabledBuiltinModelId(allIds)).toBeNull();
    expect(isBuiltinModelEnabled("not-a-model", [])).toBe(false);
  });
});
