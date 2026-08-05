"use client";

import { useEffect, type ReactNode } from "react";
import { applyTheme, resolveSystemTheme } from "@/lib/theme/bootstrap";

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  useEffect(() => {
    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

    const syncTheme = () => {
      applyTheme(resolveSystemTheme());
    };

    syncTheme();
    media?.addEventListener("change", syncTheme);

    return () => media?.removeEventListener("change", syncTheme);
  }, []);

  return children;
}
