"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BRAIN_CHAT_MODE_OPTIONS,
  getBrainChatModeMeta,
  isBrainChatMode,
  type BrainChatMode,
} from "@/lib/chat/chat-mode";
import { cn } from "@/lib/utils";

const MODE_TRIGGER_CLASS: Record<BrainChatMode, string> = {
  ask: "text-[var(--brain-mode-ask-foreground)] hover:bg-[var(--brain-mode-ask-muted)] data-[state=open]:bg-[var(--brain-mode-ask-muted)]",
  agent:
    "text-muted-foreground hover:text-foreground hover:bg-background/45 data-[state=open]:bg-background/45",
  plan: "text-[var(--brain-mode-plan-foreground)] hover:bg-[var(--brain-mode-plan-muted)] data-[state=open]:bg-[var(--brain-mode-plan-muted)]",
  debug:
    "text-[var(--brain-mode-debug-foreground)] hover:bg-[var(--brain-mode-debug-muted)] data-[state=open]:bg-[var(--brain-mode-debug-muted)]",
};

const MODE_DOT_CLASS: Record<BrainChatMode, string> = {
  ask: "bg-[var(--brain-mode-ask)]",
  agent: "bg-muted-foreground/50",
  plan: "bg-[var(--brain-mode-plan)]",
  debug: "bg-[var(--brain-mode-debug)]",
};

export function ChatModePicker({
  disabled = false,
  mode,
  onModeChange,
}: {
  readonly disabled?: boolean;
  readonly mode: BrainChatMode;
  readonly onModeChange: (mode: BrainChatMode) => void;
}) {
  const selected = getBrainChatModeMeta(mode);

  return (
    <Select
      disabled={disabled}
      onValueChange={(value) => {
        if (isBrainChatMode(value)) {
          onModeChange(value);
        }
      }}
      value={mode}
    >
      <SelectTrigger
        aria-label="Chat mode"
        className={cn(
          "h-8 max-w-32 truncate rounded-full border-0 bg-transparent px-2.5 text-xs shadow-none transition-colors focus-visible:ring-0",
          MODE_TRIGGER_CLASS[mode],
        )}
        data-chat-mode={mode}
        size="sm"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden
            className={cn("size-1.5 shrink-0 rounded-full", MODE_DOT_CLASS[mode])}
          />
          <SelectValue placeholder={selected.label} />
        </span>
      </SelectTrigger>
      <SelectContent align="start" className="min-w-[15rem]">
        {BRAIN_CHAT_MODE_OPTIONS.map((option) => (
          <SelectItem className="items-start py-2" key={option.id} value={option.id}>
            <div className="flex min-w-0 items-start gap-2">
              <span
                aria-hidden
                className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", MODE_DOT_CLASS[option.id])}
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <SelectItemText>{option.label}</SelectItemText>
                <span className="text-muted-foreground text-xs">{option.description}</span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
