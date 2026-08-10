"use client";

import { getBrainChatModel } from "@/agent/lib/models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CatalogModelDto } from "@/lib/chat/custom-models-api";

export function ModelPicker({
  disabled = false,
  models,
  onModelIdChange,
  selectedModelId,
}: {
  readonly disabled?: boolean;
  readonly models: readonly CatalogModelDto[];
  readonly onModelIdChange: (modelId: string) => void;
  readonly selectedModelId: string;
}) {
  const options =
    models.length > 0
      ? models
      : [
          {
            id: getBrainChatModel(selectedModelId).id,
            label: getBrainChatModel(selectedModelId).label,
            description: getBrainChatModel(selectedModelId).description,
            contextWindowTokens: getBrainChatModel(selectedModelId).contextWindowTokens,
            source: "command-code" as const,
          },
        ];

  const selected =
    options.find((model) => model.id === selectedModelId) ??
    options[0] ??
    getBrainChatModel(selectedModelId);

  return (
    <Select disabled={disabled} onValueChange={onModelIdChange} value={selected.id}>
      <SelectTrigger
        aria-label="Model"
        className="text-muted-foreground hover:text-foreground hover:bg-background/45 data-[state=open]:bg-background/45 h-8 max-w-40 truncate rounded-full border-0 bg-transparent px-2.5 text-xs shadow-none focus-visible:ring-0"
        size="sm"
      >
        <SelectValue placeholder={selected.label} />
      </SelectTrigger>
      <SelectContent align="start" className="min-w-[16.5rem]">
        {options.map((model) => (
          <SelectItem className="items-start py-2" key={model.id} value={model.id}>
            <div className="flex min-w-0 flex-col gap-0.5">
              <SelectItemText>{model.label}</SelectItemText>
              <span className="text-muted-foreground text-xs">{model.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
