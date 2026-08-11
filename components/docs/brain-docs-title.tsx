"use client";

import { BrainMark } from "@/components/brain-mark";

export function BrainDocsTitle() {
  return (
    <span className="inline-flex items-center gap-2.5 font-[family-name:var(--font-docs-display)] text-[0.95rem] font-semibold tracking-tight">
      <BrainMark className="size-6" />
      <span className="inline-flex items-baseline gap-1.5">
        <span>Brain</span>
        <span className="text-fd-muted-foreground font-medium">Docs</span>
      </span>
    </span>
  );
}
