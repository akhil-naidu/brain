"use client";

import { CalendarClockIcon } from "lucide-react";
import { IconTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function SchedulesMenu({
  disabled = false,
  open = false,
  onOpenChange,
}: {
  readonly disabled?: boolean;
  readonly open?: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  return (
    <IconTooltip label="Schedules" side="top">
      <button
        aria-expanded={open}
        aria-label="Schedules"
        className={cn(
          "text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground focus-visible:bg-muted/50 focus-visible:text-foreground dark:text-muted-foreground/50 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          open && "bg-muted/50 text-foreground",
        )}
        disabled={disabled}
        onClick={() => {
          onOpenChange(!open);
        }}
        type="button"
      >
        <CalendarClockIcon className="size-4" />
      </button>
    </IconTooltip>
  );
}
