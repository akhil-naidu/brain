import Link from "next/link";
import type { ReactNode } from "react";
import { BrainMark } from "@/components/brain-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StatusAction = {
  readonly label: string;
  readonly href?: string;
  readonly onClick?: () => void;
  readonly variant?: "default" | "outline";
};

export function StatusPage({
  actions,
  code,
  description,
  title,
}: {
  readonly actions: readonly StatusAction[];
  readonly code?: string;
  readonly description: ReactNode;
  readonly title: string;
}) {
  return (
    <main className="bg-background text-foreground relative flex min-h-dvh flex-col items-center justify-center px-5 py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-primary/8 absolute top-1/4 left-1/2 size-[36rem] -translate-x-1/2 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <Link
          className="border-border/50 bg-background/60 mb-8 flex size-14 items-center justify-center rounded-2xl border backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
          href="/"
        >
          <BrainMark className="size-8" />
        </Link>

        {code ? (
          <p className="text-muted-foreground mb-3 text-xs font-medium tracking-[0.2em] uppercase">
            {code}
          </p>
        ) : null}

        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>

        <div className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-[0.95rem]">
          {description}
        </div>

        {actions.length > 0 ? (
          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            {actions.map((action) => {
              const variant = action.variant ?? "default";
              const className = cn("h-11 w-full sm:w-auto sm:min-w-36");

              if (action.href) {
                return (
                  <Button asChild className={className} key={action.label} variant={variant}>
                    <Link href={action.href}>{action.label}</Link>
                  </Button>
                );
              }

              return (
                <Button
                  className={className}
                  key={action.label}
                  onClick={action.onClick}
                  type="button"
                  variant={variant}
                >
                  {action.label}
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}
