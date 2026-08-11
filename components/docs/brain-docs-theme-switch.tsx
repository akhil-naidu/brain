"use client";

import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import type { ThemeSwitchProps } from "fumadocs-ui/layouts/shared/slots/theme-switch";
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  setThemePreference,
  type Theme,
} from "@/lib/theme/bootstrap";
import { cn } from "@/lib/utils";

function nextTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}

/**
 * Docs sidebar theme control that uses Brain's document theme classes
 * (not a second next-themes provider).
 */
export function BrainDocsThemeSwitch({ className, mode: _mode, ...props }: ThemeSwitchProps) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const sync = () => {
      setTheme(resolveTheme(readThemePreference()));
    };
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const onToggle = useCallback(() => {
    const next = nextTheme(resolveTheme(readThemePreference()));
    setThemePreference(next);
    applyTheme(next);
    setTheme(next);
    // Notify same-tab listeners (storage events only fire cross-tab).
    window.dispatchEvent(new Event("brain-theme-change"));
  }, []);

  useEffect(() => {
    const sync = () => setTheme(resolveTheme(readThemePreference()));
    window.addEventListener("brain-theme-change", sync);
    return () => window.removeEventListener("brain-theme-change", sync);
  }, []);

  return (
    <div className={cn("inline-flex", className)} {...props}>
      <button
        type="button"
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-md text-fd-muted-foreground transition-colors",
          "hover:bg-fd-accent hover:text-fd-accent-foreground",
        )}
        onClick={onToggle}
      >
        <Sun className="size-4 dark:hidden" aria-hidden="true" />
        <Moon className="hidden size-4 dark:block" aria-hidden="true" />
      </button>
    </div>
  );
}
