export type BrainChatModel = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly contextWindowTokens: number;
};

/**
 * Curated OpenAI-compatible Command Code chat models.
 * Anthropic `/messages`-only models are intentionally excluded.
 */
export const BRAIN_CHAT_MODELS: readonly BrainChatModel[] = [
  {
    id: "deepseek/deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    description: "Stronger reasoning",
    contextWindowTokens: 1_000_000,
  },
  {
    id: "deepseek/deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    description: "Faster and cheaper",
    contextWindowTokens: 1_000_000,
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
