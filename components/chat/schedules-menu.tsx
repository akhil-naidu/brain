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
          "text-muted-foreground/65 hover:bg-background/45 hover:text-foreground focus-visible:bg-background/45 focus-visible:text-foreground dark:text-muted-foreground/55 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          open && "bg-background/45 text-foreground",
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
