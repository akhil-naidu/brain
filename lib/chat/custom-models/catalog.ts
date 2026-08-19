import { BRAIN_CHAT_MODELS, type BrainChatModel } from "@/agent/lib/models";
import { getBuiltinModelStore } from "@/lib/chat/builtin-models/store";
import { isCommandCodeApiKeyConfigured } from "@/lib/chat/provider-setup";
import {
  catalogContainsModelId,
  defaultCatalogModelId,
} from "@/lib/chat/custom-models/catalog-shared";
import { customModelSelectableId } from "@/lib/chat/custom-models/ids";
import { getCustomModelStore } from "@/lib/chat/custom-models/store";
import type { CustomModelRecord } from "@/lib/chat/custom-models/types";

export { catalogContainsModelId, defaultCatalogModelId };

export type CatalogModelSource = "command-code" | "instance" | "workspace";

export type CatalogModel = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly contextWindowTokens: number;
  readonly source: CatalogModelSource;
};

function curatedEntries(includeCurated: boolean, disabledIds: readonly string[]): CatalogModel[] {
  if (!includeCurated) {
    return [];
  }
  const disabled = new Set(disabledIds);
  return BRAIN_CHAT_MODELS.filter((model) => !disabled.has(model.id)).map((model) => ({
    id: model.id,
    label: model.label,
    description: model.description,
    contextWindowTokens: model.contextWindowTokens,
    source: "command-code" as const,
  }));
}

function customEntry(model: CustomModelRecord): CatalogModel {
  const scopeLabel = model.scope === "instance" ? "Instance" : "Workspace";
  const detail = model.description.trim() || model.providerModelId;
  return {
    id: customModelSelectableId(model.id),
    label: model.label,
    description: `${scopeLabel} · ${detail}`,
    contextWindowTokens: model.contextWindowTokens,
    source: model.scope,
  };
}

export function attachCustomModelEnabled<T extends { readonly id: string }>(
  models: readonly T[],
  disabledIds: readonly string[],
): readonly (T & { readonly enabled: boolean })[] {
  const disabled = new Set(disabledIds);
  return models.map((model) => ({ ...model, enabled: !disabled.has(model.id) }));
}

export async function buildMergedModelCatalog(input: {
  readonly workspaceId: string;
  readonly includeCurated?: boolean;
  readonly disabledBuiltinModelIds?: readonly string[];
  readonly disabledCustomModelIds?: readonly string[];
  readonly env?: Record<string, string | undefined>;
}): Promise<readonly CatalogModel[]> {
  const env = input.env ?? process.env;
  const includeCurated = input.includeCurated ?? isCommandCodeApiKeyConfigured(env);
  const store = getCustomModelStore(env);
  const [customs, disabledBuiltinModelIds, disabledCustomModelIds] = await Promise.all([
    store.listVisibleModels(input.workspaceId),
    input.disabledBuiltinModelIds
      ? Promise.resolve(input.disabledBuiltinModelIds)
      : getBuiltinModelStore(env).listDisabledModelIds(input.workspaceId),
    input.disabledCustomModelIds
      ? Promise.resolve(input.disabledCustomModelIds)
      : store.listDisabledModelIds(input.workspaceId),
  ]);
  const disabledCustoms = new Set(disabledCustomModelIds);
  return [
    ...curatedEntries(includeCurated, disabledBuiltinModelIds),
    ...customs.filter((model) => !disabledCustoms.has(model.id)).map(customEntry),
  ];
}

export function toBrainChatModelShape(entry: CatalogModel): BrainChatModel {
  return {
    id: entry.id,
    label: entry.label,
    description: entry.description,
    contextWindowTokens: entry.contextWindowTokens,
  };
}
