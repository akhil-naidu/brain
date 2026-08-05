"use client";

import { BRAIN_CHAT_MODELS, getBrainChatModel } from "@/agent/lib/models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ModelPicker({
  disabled = false,
  onModelIdChange,
  selectedModelId,
}: {
  readonly disabled?: boolean;
  readonly onModelIdChange: (modelId: string) => void;
  readonly selectedModelId: string;
}) {
  const selected = getBrainChatModel(selectedModelId);

  return (
    <Select disabled={disabled} onValueChange={onModelIdChange} value={selected.id}>
      <SelectTrigger
        aria-label="Model"
        className="text-muted-foreground hover:text-foreground h-8 max-w-[13.5rem] border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
        size="sm"
      >
        <SelectValue placeholder={selected.label} />
      </SelectTrigger>
      <SelectContent align="start" className="min-w-[16.5rem]">
        {BRAIN_CHAT_MODELS.map((model) => (
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
