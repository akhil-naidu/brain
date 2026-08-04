"use client";

import type { WelcomePrompt } from "@/lib/chat/welcome-prompts";
import { cn } from "@/lib/utils";

export function WelcomePrompts({
  className,
  onSelect,
  prompts,
}: {
  readonly className?: string;
  readonly onSelect: (prompt: string) => void;
  readonly prompts: readonly WelcomePrompt[];
}) {
  if (prompts.length === 0) {
    return null;
  }

  return (
    <div className={cn("mx-auto mt-7 w-full max-w-md text-left", className)}>
      <p className="text-muted-foreground/80 mb-2 text-xs font-medium tracking-wide uppercase">
        Try asking
      </p>
      <ul className="flex flex-col gap-0.5">
        {prompts.map((item) => (
          <li key={item.id}>
            <button
              className="text-foreground hover:bg-muted/70 focus-visible:ring-ring/50 w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
              onClick={() => onSelect(item.prompt)}
              type="button"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
