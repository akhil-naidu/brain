import { describe, expect, it } from "vitest";
import {
  BRAIN_CHAT_MODELS,
  DEFAULT_BRAIN_CHAT_MODEL_ID,
  getBrainChatModel,
  isBrainChatModelId,
  resolveBrainChatModelId,
} from "@/agent/lib/models";
import { extractSelectedModelIdFromMessages } from "@/agent/lib/client-context-model";

describe("brain chat models", () => {
  it("curates chat-completions models with clearer labels", () => {
    expect(BRAIN_CHAT_MODELS.length).toBeGreaterThanOrEqual(6);
    expect(BRAIN_CHAT_MODELS.every((model) => !model.id.startsWith("claude"))).toBe(true);
    expect(isBrainChatModelId("gpt-5.6-terra")).toBe(true);
    expect(isBrainChatModelId("google/gemini-3.6-flash")).toBe(true);
    expect(isBrainChatModelId("moonshotai/Kimi-K3")).toBe(true);
    expect(getBrainChatModel("deepseek/deepseek-v4-pro").description).toMatch(/Default/i);
    expect(getBrainChatModel("gpt-5.6-luna").label).toBe("GPT-5.6 Luna");
  });

  it("resolves known and unknown ids", () => {
    expect(DEFAULT_BRAIN_CHAT_MODEL_ID).toBe("deepseek/deepseek-v4-pro");
    expect(isBrainChatModelId("deepseek/deepseek-v4-flash")).toBe(true);
    expect(isBrainChatModelId("not-a-model")).toBe(false);
    expect(resolveBrainChatModelId("deepseek/deepseek-v4-flash")).toBe(
      "deepseek/deepseek-v4-flash",
    );
    expect(resolveBrainChatModelId("nope")).toBe(DEFAULT_BRAIN_CHAT_MODEL_ID);
    expect(getBrainChatModel("deepseek/deepseek-v4-flash").label).toBe("DeepSeek V4 Flash");
  });

  it("extracts modelId from the newest client context message", () => {
    const modelId = extractSelectedModelIdFromMessages([
      {
        role: "user",
        content: 'Client context:\n{"modelId":"deepseek/deepseek-v4-pro","connections":"x"}',
      },
      {
        role: "assistant",
        content: "ok",
      },
      {
        role: "user",
        content: 'Client context:\n{"modelId":"deepseek/deepseek-v4-flash","connections":"y"}',
      },
      {
        role: "user",
        content: "hello",
      },
    ]);

    expect(modelId).toBe("deepseek/deepseek-v4-flash");
  });

  it("falls back when client context is missing or invalid", () => {
    expect(extractSelectedModelIdFromMessages([])).toBe(DEFAULT_BRAIN_CHAT_MODEL_ID);
    expect(
      extractSelectedModelIdFromMessages([
        {
          role: "user",
          content: 'Client context:\n{"modelId":"unknown/model"}',
        },
      ]),
    ).toBe(DEFAULT_BRAIN_CHAT_MODEL_ID);
  });
});
