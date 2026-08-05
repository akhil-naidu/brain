export type SidebarSectionsState = {
  readonly chats: boolean;
  readonly playbooks: boolean;
  readonly schedules: boolean;
};

export const SIDEBAR_SECTIONS_STORAGE_KEY = "brain.sidebar-sections.v1";

export const DEFAULT_SIDEBAR_SECTIONS: SidebarSectionsState = {
  chats: true,
  playbooks: true,
  schedules: true,
};

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function readSectionFlag(record: object, key: keyof SidebarSectionsState, fallback: boolean) {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor) {
    return fallback;
  }
  const value: unknown = descriptor.value;
  return isBoolean(value) ? value : fallback;
}

export function readSidebarSections(
  storage: Pick<Storage, "getItem"> | null = typeof window === "undefined"
    ? null
    : window.localStorage,
): SidebarSectionsState {
  if (!storage) {
    return DEFAULT_SIDEBAR_SECTIONS;
  }
  try {
    const raw = storage.getItem(SIDEBAR_SECTIONS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SIDEBAR_SECTIONS;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_SIDEBAR_SECTIONS;
    }
    return {
      chats: readSectionFlag(parsed, "chats", DEFAULT_SIDEBAR_SECTIONS.chats),
      playbooks: readSectionFlag(parsed, "playbooks", DEFAULT_SIDEBAR_SECTIONS.playbooks),
      schedules: readSectionFlag(parsed, "schedules", DEFAULT_SIDEBAR_SECTIONS.schedules),
    };
  } catch {
    return DEFAULT_SIDEBAR_SECTIONS;
  }
}

export function writeSidebarSections(
  sections: SidebarSectionsState,
  storage: Pick<Storage, "setItem"> | null = typeof window === "undefined"
    ? null
    : window.localStorage,
) {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(SIDEBAR_SECTIONS_STORAGE_KEY, JSON.stringify(sections));
  } catch {
    // Ignore storage failures.
  }
}
