"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsShell({
  title,
  description,
  meta,
  children,
  className,
}: {
  readonly title: string;
  readonly description?: string;
  readonly meta?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("bg-background h-full overflow-y-auto", className)}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
          </div>
          {meta}
        </header>
        {children}
      </div>
    </div>
  );
}

export function SettingsSection({
  title,
  description,
  children,
  actions,
}: {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-medium tracking-tight">{title}</h2>
          {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function SettingsPanel({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("border-border/80 bg-card/40 rounded-xl border", className)}>{children}</div>
  );
}

export function SettingsTabs({
  tabs,
  active,
  onChange,
}: {
  readonly tabs: readonly { readonly id: string; readonly label: string }[];
  readonly active: string;
  readonly onChange: (id: string) => void;
}) {
  return (
    <div className="border-border/70 flex flex-wrap gap-1 border-b pb-px">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            aria-current={selected ? "page" : undefined}
            className={cn(
              "relative -mb-px cursor-pointer rounded-t-md px-3 py-2 text-sm transition-colors",
              selected
                ? "text-foreground border-foreground border-b-2 font-medium"
                : "text-muted-foreground hover:text-foreground border-b-2 border-transparent",
            )}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsBadge({ children }: { readonly children: ReactNode }) {
  return (
    <span className="border-border bg-muted/50 text-muted-foreground inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase">
      {children}
    </span>
  );
}
