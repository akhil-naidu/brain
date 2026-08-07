import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SettingsRowsSkeleton({
  className,
  rows = 4,
}: {
  readonly className?: string;
  readonly rows?: number;
}) {
  return (
    <div className={cn("divide-border/70 divide-y", className)} aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div className="flex items-center gap-3 px-4 py-3.5" key={index}>
          <Skeleton className="size-9 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48 max-w-full" />
          </div>
          <Skeleton className="h-7 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SettingsCardsSkeleton({
  className,
  cards = 3,
}: {
  readonly className?: string;
  readonly cards?: number;
}) {
  return (
    <div className={cn("grid gap-3", className)} aria-hidden>
      {Array.from({ length: cards }, (_, index) => (
        <div
          className="border-border/70 bg-card/40 flex items-start gap-3 rounded-xl border p-4"
          key={index}
        >
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-full max-w-sm" />
            <Skeleton className="h-3 w-40 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormFieldsSkeleton({
  className,
  fields = 3,
}: {
  readonly className?: string;
  readonly fields?: number;
}) {
  return (
    <div className={cn("space-y-4", className)} aria-hidden>
      {Array.from({ length: fields }, (_, index) => (
        <div className="space-y-2" key={index}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ className }: { readonly className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "border-border/60 bg-card/40 mx-auto w-full max-w-md space-y-3 rounded-xl border p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-52 max-w-full" />
      <Skeleton className="mt-2 h-9 w-full rounded-lg" />
    </div>
  );
}
