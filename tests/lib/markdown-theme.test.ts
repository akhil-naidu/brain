import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDocumentIsDark,
  getMermaidThemeConfig,
  subscribeDocumentTheme,
} from "@/lib/chat/markdown-theme";

describe("markdown theme helpers", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark", "light");
  });

  it("detects the dark document class", () => {
    document.documentElement.classList.add("dark");
    expect(getDocumentIsDark()).toBe(true);
    document.documentElement.classList.remove("dark");
    expect(getDocumentIsDark()).toBe(false);
  });

  it("notifies subscribers when the document theme class changes", async () => {
    const onStoreChange = vi.fn();
    const unsubscribe = subscribeDocumentTheme(onStoreChange);
    document.documentElement.setAttribute("class", "dark");
    await vi.waitFor(() => {
      expect(onStoreChange).toHaveBeenCalled();
    });
    unsubscribe();
  });

  it("returns distinct mermaid configs for light and dark", () => {
    const light = getMermaidThemeConfig(false);
    const dark = getMermaidThemeConfig(true);
    expect(light.theme).toBe("base");
    expect(dark.theme).toBe("dark");
    expect(dark.themeVariables.primaryTextColor).not.toBe(light.themeVariables.primaryTextColor);
  });
});
