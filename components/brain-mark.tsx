import { cn } from "@/lib/utils";

export function BrainMark({ className }: { readonly className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-5 items-center justify-center text-[1.05rem] leading-none",
        className,
      )}
    >
      🧠
    </span>
  );
}
