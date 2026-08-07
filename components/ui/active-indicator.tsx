import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Marks the currently selected / in-use item.
 * Use `compact` in dense menus (check only); default is a small live pill for lists.
 */
export function ActiveIndicator({
  className,
  compact = false,
}: {
  readonly className?: string;
  readonly compact?: boolean;
}) {
  if (compact) {
    return (
      <CheckIcon aria-label="Active" className={cn("text-foreground size-4 shrink-0", className)} />
    );
  }

  return (
    <span
      className={cn(
        "bg-foreground/5 text-foreground inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        className,
      )}
    >
      <span aria-hidden className="bg-foreground/75 size-1.5 shrink-0 rounded-full" />
      Active
    </span>
  );
}
