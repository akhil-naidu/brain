import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("bg-muted/70 dark:bg-muted/50 animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
