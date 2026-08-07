import { BrainMark } from "@/components/brain-mark";
import { cn } from "@/lib/utils";

export function BrainBoot({
  className,
  label = "Loading Brain",
  size = "md",
}: {
  readonly className?: string;
  readonly label?: string;
  readonly size?: "sm" | "md" | "lg";
}) {
  const markClass = size === "lg" ? "size-12" : size === "sm" ? "size-7" : "size-9";
  const ringClass = size === "lg" ? "size-[5.5rem]" : size === "sm" ? "size-12" : "size-[4.25rem]";

  return (
    <output
      aria-busy="true"
      aria-live="polite"
      className={cn("text-foreground flex flex-col items-center justify-center gap-4", className)}
    >
      <div className="relative flex items-center justify-center">
        <div
          aria-hidden
          className={cn(
            "border-primary/25 absolute rounded-full border",
            "brain-boot-ring",
            ringClass,
          )}
        />
        <div
          aria-hidden
          className={cn(
            "bg-primary/10 ring-primary/15 flex items-center justify-center rounded-2xl ring-1",
            "brain-boot-mark",
            size === "lg" ? "size-16" : size === "sm" ? "size-10" : "size-14",
          )}
        >
          <BrainMark className={markClass} />
        </div>
      </div>
      <span className="space-y-1 text-center">
        <span className="block text-sm font-medium tracking-tight">Brain</span>
        <span className="text-muted-foreground block text-xs">{label}</span>
      </span>
    </output>
  );
}
