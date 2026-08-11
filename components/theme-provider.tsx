"use client";

import { useEffect, type ReactNode } from "react";
import { applyTheme, readThemePreference, resolveTheme } from "@/lib/theme/bootstrap";

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  useEffect(() => {
    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

    const syncTheme = () => {
      applyTheme(resolveTheme(readThemePreference()));
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === "brain-theme") {
        syncTheme();
      }
    };

    syncTheme();
    media?.addEventListener("change", syncTheme);
    window.addEventListener("storage", onStorage);
    window.addEventListener("brain-theme-change", syncTheme);

    return () => {
      media?.removeEventListener("change", syncTheme);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("brain-theme-change", syncTheme);
    };
  }, []);

  return children;
}
