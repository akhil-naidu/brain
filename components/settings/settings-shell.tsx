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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-3">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
                {description}
              </p>
            ) : null}
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
  readonly title?: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}) {
  const hasHeader = Boolean(title || description || actions);
  return (
    <section className="space-y-4">
      {hasHeader ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            {title ? <h2 className="text-sm font-medium tracking-tight">{title}</h2> : null}
            {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
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
    <div
      aria-label="Settings sections"
      className="border-border/80 bg-muted/35 inline-flex w-fit max-w-full flex-wrap gap-0.5 rounded-xl border p-1"
      role="tablist"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            aria-selected={selected}
            className={cn(
              "cursor-pointer rounded-lg px-3.5 py-1.5 text-sm transition-[color,background-color,box-shadow]",
              selected
                ? "bg-background text-foreground ring-border/70 shadow-sm ring-1"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
            )}
            id={`settings-tab-${tab.id}`}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            role="tab"
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
