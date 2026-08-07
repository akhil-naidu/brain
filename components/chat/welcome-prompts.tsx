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
    <div className={cn("mx-auto w-full max-w-lg text-left", className)}>
      <p className="text-muted-foreground mb-2.5 text-xs font-medium">Suggestions</p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {prompts.map((item) => (
          <li className={item.primary ? "sm:col-span-2" : undefined} key={item.id}>
            <button
              className={cn(
                "focus-visible:ring-ring/50 w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors focus-visible:ring-2 focus-visible:outline-none",
                item.primary
                  ? "border-primary/25 bg-primary/8 text-foreground hover:bg-primary/12 border font-medium"
                  : "border-border/60 bg-muted/25 text-foreground/90 hover:bg-muted/50 hover:text-foreground border",
              )}
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
