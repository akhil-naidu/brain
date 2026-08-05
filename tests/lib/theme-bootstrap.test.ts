import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_BOOTSTRAP_SCRIPT, applyTheme, resolveSystemTheme } from "@/lib/theme/bootstrap";

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
  it("applies the system preference before React hydrates", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("prefers-color-scheme: dark");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("classList.add");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("colorScheme");
  });
});
