import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import { SITE_STAGE } from "@/lib/seo/site";
import { cn } from "@/lib/utils";

type BetaBadgeProps = {
  readonly className?: string;
  readonly size?: "sm" | "md";
} & Omit<ComponentProps<typeof Badge>, "children" | "variant">;

/** Product-stage tag shown next to the Brain wordmark. */
export function BetaBadge({ className, size = "sm", ...props }: BetaBadgeProps) {
  return (
    <Badge
      aria-label={`${SITE_STAGE} release`}
      className={cn(
        "border-foreground/15 bg-foreground/5 text-foreground/70 align-middle font-medium tracking-[0.08em] uppercase",
        size === "sm" && "px-1.5 py-0 text-[0.65rem] leading-4",
        size === "md" && "px-2 py-0.5 text-[0.7rem] leading-5",
        className,
      )}
      variant="outline"
      {...props}
    >
      {SITE_STAGE}
    </Badge>
  );
}
