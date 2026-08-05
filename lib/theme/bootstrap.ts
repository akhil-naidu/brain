export type Theme = "dark" | "light";

export function resolveSystemTheme(
  matchMedia: ((query: string) => MediaQueryList) | undefined = globalThis.matchMedia,
): Theme {
  if (typeof matchMedia !== "function") {
    return "light";
  }

  try {
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement) {
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

/**
 * Blocking bootstrap for `app/layout.tsx`. Runs before paint so class-based
 * `dark:` utilities match the system preference without waiting on React.
 */
export const THEME_BOOTSTRAP_SCRIPT =
  '(()=>{try{var d=document.documentElement;var t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.classList.remove("dark","light");d.classList.add(t);d.style.colorScheme=t;}catch(e){}})();';
