import { describe, expect, it } from "vitest";
import {
  DEFAULT_SIDEBAR_RECENT,
  SIDEBAR_RECENT_MAX_HEIGHT,
  SIDEBAR_RECENT_MIN_HEIGHT,
  SIDEBAR_RECENT_STORAGE_KEY,
  clampSidebarRecentHeight,
  readSidebarRecent,
  writeSidebarRecent,
} from "@/lib/chat/sidebar-recent";

function memoryStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? (map.get(key) ?? null) : null;
    },
    key() {
      return null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("sidebar recent prefs", () => {
  it("returns defaults for missing or invalid storage", () => {
    expect(readSidebarRecent(null)).toEqual(DEFAULT_SIDEBAR_RECENT);
    expect(readSidebarRecent(memoryStorage())).toEqual(DEFAULT_SIDEBAR_RECENT);
    expect(readSidebarRecent(memoryStorage({ [SIDEBAR_RECENT_STORAGE_KEY]: "{bad" }))).toEqual(
      DEFAULT_SIDEBAR_RECENT,
    );
  });

  it("persists open state and clamps height", () => {
    const storage = memoryStorage();
    writeSidebarRecent({ open: false, heightPx: 40 }, storage);
    expect(readSidebarRecent(storage)).toEqual({
      open: false,
      heightPx: SIDEBAR_RECENT_MIN_HEIGHT,
    });
    writeSidebarRecent({ open: true, heightPx: 900 }, storage);
    expect(readSidebarRecent(storage)).toEqual({
      open: true,
      heightPx: SIDEBAR_RECENT_MAX_HEIGHT,
    });
  });

  it("clamps height helpers", () => {
    expect(clampSidebarRecentHeight(10)).toBe(SIDEBAR_RECENT_MIN_HEIGHT);
    expect(clampSidebarRecentHeight(999)).toBe(SIDEBAR_RECENT_MAX_HEIGHT);
    expect(clampSidebarRecentHeight(240)).toBe(240);
  });
});
