"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

/**
 * Keeps a settings-style tab selection in the URL (`?tab=…`) so reloads restore it.
 */
export function useTabSearchParam({
  tabs,
  defaultTab,
  key = "tab",
  ready = true,
}: {
  readonly tabs: readonly string[];
  readonly defaultTab: string;
  readonly key?: string;
  /** When false, skip rewriting invalid URL tabs (e.g. while workspace kind loads). */
  readonly ready?: boolean;
}): readonly [string, (next: string) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const allowed = useMemo(() => new Set(tabs), [tabs]);
  const fallback = allowed.has(defaultTab) ? defaultTab : (tabs[0] ?? defaultTab);

  const raw = searchParams.get(key);
  const tab = raw && allowed.has(raw) ? raw : fallback;

  const setTab = useCallback(
    (next: string) => {
      const nextTab = allowed.has(next) ? next : fallback;
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, nextTab);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [allowed, fallback, key, pathname, router, searchParams],
  );

  useEffect(() => {
    if (!ready || tabs.length === 0) {
      return;
    }
    if (raw && !allowed.has(raw)) {
      setTab(fallback);
    }
  }, [allowed, fallback, raw, ready, setTab, tabs.length]);

  return [tab, setTab] as const;
}
