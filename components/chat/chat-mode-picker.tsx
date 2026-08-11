"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type BrainChatMode } from "@/lib/chat/chat-mode";

const OPTIONS: readonly {
  readonly id: BrainChatMode;
  readonly label: string;
  readonly description: string;
}[] = [
  {
    id: "ask",
    label: "Ask",
    description: "Plain chat — no tools",
  },
  {
    id: "agent",
    label: "Agent",
    description: "Chat + tools when needed",
  },
];

export function ChatModePicker({
  disabled = false,
  mode,
  onModeChange,
}: {
  readonly disabled?: boolean;
  readonly mode: BrainChatMode;
  readonly onModeChange: (mode: BrainChatMode) => void;
}) {
  const selectedLabel = mode === "ask" ? "Ask" : "Agent";

  return (
    <Select
      disabled={disabled}
      onValueChange={(value) => {
        if (value === "ask" || value === "agent") {
          onModeChange(value);
        }
      }}
      value={mode}
    >
      <SelectTrigger
        aria-label="Chat mode"
        className="text-muted-foreground hover:text-foreground hover:bg-background/45 data-[state=open]:bg-background/45 h-8 max-w-28 truncate rounded-full border-0 bg-transparent px-2.5 text-xs shadow-none focus-visible:ring-0"
        size="sm"
      >
        <SelectValue placeholder={selectedLabel} />
      </SelectTrigger>
      <SelectContent align="start" className="min-w-[14rem]">
        {OPTIONS.map((option) => (
          <SelectItem className="items-start py-2" key={option.id} value={option.id}>
            <div className="flex min-w-0 flex-col gap-0.5">
              <SelectItemText>{option.label}</SelectItemText>
              <span className="text-muted-foreground text-xs">{option.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
