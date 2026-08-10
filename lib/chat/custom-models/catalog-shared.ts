import { DEFAULT_BRAIN_CHAT_MODEL_ID } from "@/agent/lib/models";

export type CatalogModelLike = {
  readonly id: string;
};

export function defaultCatalogModelId(catalog: readonly CatalogModelLike[]): string {
  const preferred = catalog.find((entry) => entry.id === DEFAULT_BRAIN_CHAT_MODEL_ID);
  if (preferred) {
    return preferred.id;
  }
  return catalog[0]?.id ?? DEFAULT_BRAIN_CHAT_MODEL_ID;
}

export function catalogContainsModelId(
  catalog: readonly CatalogModelLike[],
  modelId: string,
): boolean {
  return catalog.some((entry) => entry.id === modelId);
}
