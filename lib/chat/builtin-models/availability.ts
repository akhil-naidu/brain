import { BRAIN_CHAT_MODELS, isBrainChatModelId, type BrainChatModel } from "@/agent/lib/models";

export type BuiltinModelAvailability = BrainChatModel & {
  readonly enabled: boolean;
};

export function builtinModelsWithAvailability(
  disabledIds: readonly string[],
): readonly BuiltinModelAvailability[] {
  const disabled = new Set(disabledIds);
  return BRAIN_CHAT_MODELS.map((model) => ({
    ...model,
    enabled: !disabled.has(model.id),
  }));
}

export function isBuiltinModelEnabled(modelId: string, disabledIds: readonly string[]): boolean {
  if (!isBrainChatModelId(modelId)) {
    return false;
  }
  return !disabledIds.includes(modelId);
}

export function firstEnabledBuiltinModelId(disabledIds: readonly string[]): string | null {
  const disabled = new Set(disabledIds);
  return BRAIN_CHAT_MODELS.find((model) => !disabled.has(model.id))?.id ?? null;
}
