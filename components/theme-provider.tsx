"use client";

import { useEffect, type ReactNode } from "react";

type Theme = "dark" | "light";

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  useEffect(() => {
    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

    const syncTheme = () => {
      // System preference when available; light is the fallback default.
      applyTheme(media?.matches ? "dark" : "light");
    };

    syncTheme();
    media?.addEventListener("change", syncTheme);

    return () => media?.removeEventListener("change", syncTheme);
  }, []);

  return children;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}
