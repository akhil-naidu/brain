export type Theme = "dark" | "light";
export type ThemePreference = Theme | "system";

export const THEME_STORAGE_KEY = "brain-theme";

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

export function resolveTheme(
  preference: ThemePreference,
  matchMedia: ((query: string) => MediaQueryList) | undefined = globalThis.matchMedia,
): Theme {
  if (preference === "light" || preference === "dark") {
    return preference;
  }
  return resolveSystemTheme(matchMedia);
}

export function readThemePreference(
  storage: Pick<Storage, "getItem"> | null | undefined = globalThis.localStorage,
): ThemePreference {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  } catch {
    // ignore quota / privacy mode
  }
  return "system";
}

export function setThemePreference(
  preference: ThemePreference,
  storage: Pick<Storage, "setItem"> | null | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // ignore quota / privacy mode
  }
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement) {
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

/**
 * Blocking bootstrap for `app/layout.tsx`. Runs before paint so class-based
 * `dark:` utilities match stored preference or system without waiting on React.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(()=>{try{var d=document.documentElement;var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var t=p==="light"||p==="dark"?p:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");d.classList.remove("dark","light");d.classList.add(t);d.style.colorScheme=t;}catch(e){}})();`;
