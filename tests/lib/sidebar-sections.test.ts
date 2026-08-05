import { describe, expect, it } from "vitest";
import {
  DEFAULT_SIDEBAR_SECTIONS,
  readSidebarSections,
  SIDEBAR_SECTIONS_STORAGE_KEY,
  writeSidebarSections,
} from "@/lib/chat/sidebar-sections";

function memoryStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  return {
    getItem: (key: string): string | null => {
      const value = data[key];
      return value === undefined ? null : value;
    },
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

describe("sidebar sections storage", () => {
  it("defaults when missing or invalid", () => {
    expect(readSidebarSections(null)).toEqual(DEFAULT_SIDEBAR_SECTIONS);
    expect(readSidebarSections(memoryStorage())).toEqual(DEFAULT_SIDEBAR_SECTIONS);
    expect(readSidebarSections(memoryStorage({ [SIDEBAR_SECTIONS_STORAGE_KEY]: "{bad" }))).toEqual(
      DEFAULT_SIDEBAR_SECTIONS,
    );
  });

  it("round-trips section open state", () => {
    const storage = memoryStorage();
    const next = { chats: false, playbooks: true, schedules: false };
    writeSidebarSections(next, storage);
    expect(readSidebarSections(storage)).toEqual(next);
  });

  it("fills missing keys with defaults", () => {
    const storage = memoryStorage({
      [SIDEBAR_SECTIONS_STORAGE_KEY]: JSON.stringify({ chats: false }),
    });
    expect(readSidebarSections(storage)).toEqual({
      chats: false,
      playbooks: true,
      schedules: true,
    });
  });
});
