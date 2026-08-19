import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSecretById = vi.fn();
const listVisibleModels = vi.fn();
const listDisabledBuiltinModelIds = vi.fn();
const listDisabledCustomModelIds = vi.fn();

function fakeChatModel(modelId: string) {
  return {
    specificationVersion: "v3" as const,
    provider: "mock",
    modelId,
    supportedUrls: {},
    async doGenerate() {
      return {
        content: [],
        finishReason: "stop" as const,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        warnings: [],
      };
    },
    async doStream() {
      return { stream: new ReadableStream() };
    },
  };
}

const createOpenAI = vi.fn((_options: { apiKey?: string; baseURL?: string; name?: string }) => ({
  chat: (modelId: string) => fakeChatModel(modelId),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: (options: { apiKey?: string; baseURL?: string; name?: string }) =>
    createOpenAI(options),
}));

vi.mock("@/lib/chat/custom-models/store", () => ({
  getCustomModelStore: () => ({
    getSecretById,
    listVisibleModels,
    listDisabledModelIds: listDisabledCustomModelIds,
  }),
}));

vi.mock("@/lib/chat/builtin-models/store", () => ({
  getBuiltinModelStore: () => ({
    listDisabledModelIds: listDisabledBuiltinModelIds,
  }),
}));

import { resolveChatModelSelection } from "@/agent/lib/resolve-chat-model";
import { encryptCustomModelApiKey } from "@/lib/chat/custom-models/secret";

describe("resolveChatModelSelection", () => {
  beforeEach(() => {
    listDisabledBuiltinModelIds.mockResolvedValue([]);
    listDisabledCustomModelIds.mockResolvedValue([]);
  });

  afterEach(() => {
    getSecretById.mockReset();
    listVisibleModels.mockReset();
    listDisabledBuiltinModelIds.mockReset();
    listDisabledCustomModelIds.mockReset();
    createOpenAI.mockClear();
  });

  it("falls back when the requested built-in is disabled", async () => {
    listDisabledBuiltinModelIds.mockResolvedValue(["deepseek/deepseek-v4-flash"]);
    const resolved = await resolveChatModelSelection({
      modelId: "deepseek/deepseek-v4-flash",
      workspaceId: "ws-1",
      env: { COMMAND_CODE_API_KEY: "sk-test" },
    });
    expect(resolved.selectableId).toBe("deepseek/deepseek-v4-pro");
  });

  it("resolves curated models when Command Code is configured", async () => {
    const resolved = await resolveChatModelSelection({
      modelId: "deepseek/deepseek-v4-flash",
      workspaceId: "ws-1",
      env: { COMMAND_CODE_API_KEY: "sk-test" },
    });
    expect(resolved.selectableId).toBe("deepseek/deepseek-v4-flash");
    expect(resolved.modelContextWindowTokens).toBe(1_000_000);
  });

  it("resolves visible custom models", async () => {
    const env = {
      BETTER_AUTH_SECRET: "test-only-better-auth-secret-32chars!!",
      COMMAND_CODE_API_KEY: "sk-test",
    };
    const rowId = "22222222-2222-4222-8222-222222222222";
    getSecretById.mockResolvedValue({
      id: rowId,
      scope: "workspace",
      workspaceId: "ws-1",
      label: "Local",
      description: "",
      baseUrl: "http://127.0.0.1:11434/v1",
      providerModelId: "llama3.2",
      contextWindowTokens: 8192,
      hasApiKey: true,
      apiKeyCiphertext: encryptCustomModelApiKey("ollama-key", env),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const resolved = await resolveChatModelSelection({
      modelId: `custom:${rowId}`,
      workspaceId: "ws-1",
      env,
    });

    expect(resolved.selectableId).toBe(`custom:${rowId}`);
    expect(resolved.modelContextWindowTokens).toBe(8192);
    expect(typeof resolved.model).toBe("object");
    if (typeof resolved.model !== "string") {
      expect(Reflect.get(resolved.model, "specificationVersion")).toBe("v4");
    }
  });

  it("falls back when the requested custom model is disabled", async () => {
    const rowId = "22222222-2222-4222-8222-222222222222";
    listDisabledCustomModelIds.mockResolvedValue([rowId]);
    getSecretById.mockResolvedValue({
      id: rowId,
      scope: "workspace",
      workspaceId: "ws-1",
      label: "Local",
      description: "",
      baseUrl: "http://127.0.0.1:11434/v1",
      providerModelId: "llama3.2",
      contextWindowTokens: 8192,
      hasApiKey: false,
      apiKeyCiphertext: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const resolved = await resolveChatModelSelection({
      modelId: `custom:${rowId}`,
      workspaceId: "ws-1",
      env: { COMMAND_CODE_API_KEY: "sk-test" },
    });
    expect(resolved.selectableId).toBe("deepseek/deepseek-v4-pro");
  });

  it("falls back when custom model is out of workspace scope", async () => {
    getSecretById.mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      scope: "workspace",
      workspaceId: "other-ws",
      label: "Hidden",
      description: "",
      baseUrl: "http://127.0.0.1:11434/v1",
      providerModelId: "llama3.2",
      contextWindowTokens: 8192,
      hasApiKey: false,
      apiKeyCiphertext: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const resolved = await resolveChatModelSelection({
      modelId: "custom:33333333-3333-4333-8333-333333333333",
      workspaceId: "ws-1",
      env: { COMMAND_CODE_API_KEY: "sk-test" },
    });

    expect(resolved.selectableId).toBe("deepseek/deepseek-v4-pro");
  });

  it("uses a placeholder API key when the custom model has none", async () => {
    const rowId = "44444444-4444-4444-8444-444444444444";
    getSecretById.mockResolvedValue({
      id: rowId,
      scope: "workspace",
      workspaceId: "ws-1",
      label: "Ollama",
      description: "",
      baseUrl: "http://127.0.0.1:11434/v1",
      providerModelId: "llama3.2",
      contextWindowTokens: 8192,
      hasApiKey: false,
      apiKeyCiphertext: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const resolved = await resolveChatModelSelection({
      modelId: `custom:${rowId}`,
      workspaceId: "ws-1",
      env: { BETTER_AUTH_SECRET: "test-only-better-auth-secret-32chars!!" },
    });

    expect(resolved.selectableId).toBe(`custom:${rowId}`);
    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "ollama",
        baseURL: "http://127.0.0.1:11434/v1",
      }),
    );
  });
});
