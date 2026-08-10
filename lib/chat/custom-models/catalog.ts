import { BRAIN_CHAT_MODELS, type BrainChatModel } from "@/agent/lib/models";
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

function curatedEntries(includeCurated: boolean): CatalogModel[] {
  if (!includeCurated) {
    return [];
  }
  return BRAIN_CHAT_MODELS.map((model) => ({
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

export async function buildMergedModelCatalog(input: {
  readonly workspaceId: string;
  readonly includeCurated?: boolean;
  readonly env?: Record<string, string | undefined>;
}): Promise<readonly CatalogModel[]> {
  const env = input.env ?? process.env;
  const includeCurated = input.includeCurated ?? isCommandCodeApiKeyConfigured(env);
  const store = getCustomModelStore(env);
  const customs = await store.listVisibleModels(input.workspaceId);
  return [...curatedEntries(includeCurated), ...customs.map(customEntry)];
}

export function toBrainChatModelShape(entry: CatalogModel): BrainChatModel {
  return {
    id: entry.id,
    label: entry.label,
    description: entry.description,
    contextWindowTokens: entry.contextWindowTokens,
  };
}
