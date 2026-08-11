import { afterEach, describe, expect, it, vi } from "vitest";
import {
  THEME_BOOTSTRAP_SCRIPT,
  THEME_STORAGE_KEY,
  applyTheme,
  readThemePreference,
  resolveSystemTheme,
  resolveTheme,
  setThemePreference,
} from "@/lib/theme/bootstrap";

afterEach(() => {
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.style.colorScheme = "";
});

describe("resolveSystemTheme", () => {
  it("returns dark when the system preference is dark", () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(resolveSystemTheme(matchMedia)).toBe("dark");
    expect(matchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
  });

  it("returns light when matchMedia is unavailable", () => {
    expect(resolveSystemTheme(undefined)).toBe("light");
  });
});

describe("resolveTheme", () => {
  it("honors explicit light and dark preferences", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("falls back to system when preference is system", () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(resolveTheme("system", matchMedia)).toBe("dark");
  });
});

describe("theme preference storage", () => {
  it("reads and writes the brain-theme key", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };

    expect(readThemePreference(storage)).toBe("system");
    setThemePreference("dark", storage);
    expect(store.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(readThemePreference(storage)).toBe("dark");
  });
});

describe("applyTheme", () => {
  it("replaces the theme class and color-scheme", () => {
    const root = document.documentElement;
    root.classList.add("light");

    applyTheme("dark", root);

    expect(root.classList.contains("dark")).toBe(true);
    expect(root.classList.contains("light")).toBe(false);
    expect(root.style.colorScheme).toBe("dark");
  });
});

describe("THEME_BOOTSTRAP_SCRIPT", () => {
  it("applies stored or system preference before React hydrates", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("prefers-color-scheme: dark");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("classList.add");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("colorScheme");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(THEME_STORAGE_KEY);
  });
});
