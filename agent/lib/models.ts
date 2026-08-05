export type BrainChatModel = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly contextWindowTokens: number;
};

/**
 * Curated OpenAI-compatible Command Code chat models.
 * Anthropic `/messages`-only models (Claude) are intentionally excluded —
 * Brain’s agent path uses `commandcode.chat()` → `/chat/completions`.
 */
export const BRAIN_CHAT_MODELS: readonly BrainChatModel[] = [
  {
    id: "deepseek/deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    description: "Default · strong everyday reasoning",
    contextWindowTokens: 1_000_000,
  },
  {
    id: "deepseek/deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    description: "Fast · cheapest DeepSeek option",
    contextWindowTokens: 1_000_000,
  },
  {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    description: "Balanced OpenAI for harder work",
    contextWindowTokens: 1_100_000,
  },
  {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    description: "Faster OpenAI · cost-sensitive",
    contextWindowTokens: 1_100_000,
  },
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    description: "Quick OpenAI for light tasks",
    contextWindowTokens: 400_000,
  },
  {
    id: "google/gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    description: "Fast Google · strong all-rounder",
    contextWindowTokens: 1_000_000,
  },
  {
    id: "google/gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash Lite",
    description: "Very fast · light Gemini tasks",
    contextWindowTokens: 1_000_000,
  },
  {
    id: "moonshotai/Kimi-K3",
    label: "Kimi K3",
    description: "Strong open-weight alternative",
    contextWindowTokens: 1_000_000,
  },
  {
    id: "poolside/laguna-s-2.1-free",
    label: "Laguna S 2.1",
    description: "Free · lighter capability",
    contextWindowTokens: 256_000,
  },
];

function requireModel(id: string): BrainChatModel {
  const model = BRAIN_CHAT_MODELS.find((entry) => entry.id === id);
  if (!model) {
    throw new Error(`Brain chat model "${id}" is missing from the catalog.`);
  }
  return model;
}

const DEFAULT_MODEL = requireModel("deepseek/deepseek-v4-pro");

export const DEFAULT_BRAIN_CHAT_MODEL_ID = DEFAULT_MODEL.id;

export const BRAIN_SELECTED_MODEL_STORAGE_KEY = "brain.selectedModelId";

const modelById = new Map(BRAIN_CHAT_MODELS.map((model) => [model.id, model]));

export function isBrainChatModelId(value: string): boolean {
  return modelById.has(value);
}

export function resolveBrainChatModelId(value: string | null | undefined): string {
  if (typeof value === "string" && isBrainChatModelId(value)) {
    return value;
  }
  return DEFAULT_BRAIN_CHAT_MODEL_ID;
}

export function getBrainChatModel(value: string | null | undefined): BrainChatModel {
  const id = resolveBrainChatModelId(value);
  const model = modelById.get(id);
  return model ?? DEFAULT_MODEL;
}
