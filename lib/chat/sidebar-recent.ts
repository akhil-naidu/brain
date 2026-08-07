export type SidebarRecentState = {
  readonly open: boolean;
  /** `null` means fill the remaining sidebar height. */
  readonly heightPx: number | null;
};

export const SIDEBAR_RECENT_STORAGE_KEY = "brain.sidebar-recent.v3";

export const SIDEBAR_RECENT_MIN_HEIGHT = 180;
export const SIDEBAR_RECENT_MAX_HEIGHT = 720;

export const DEFAULT_SIDEBAR_RECENT: SidebarRecentState = {
  open: true,
  heightPx: null,
};

function clampHeight(value: number): number {
  return Math.min(SIDEBAR_RECENT_MAX_HEIGHT, Math.max(SIDEBAR_RECENT_MIN_HEIGHT, value));
}

export function readSidebarRecent(
  storage: Pick<Storage, "getItem"> | null = typeof window === "undefined"
    ? null
    : window.localStorage,
): SidebarRecentState {
  if (!storage) {
    return DEFAULT_SIDEBAR_RECENT;
  }
  try {
    const raw = storage.getItem(SIDEBAR_RECENT_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SIDEBAR_RECENT;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_SIDEBAR_RECENT;
    }
    const open =
      "open" in parsed && typeof parsed.open === "boolean"
        ? parsed.open
        : DEFAULT_SIDEBAR_RECENT.open;
    let heightPx: number | null = DEFAULT_SIDEBAR_RECENT.heightPx;
    if ("heightPx" in parsed) {
      if (parsed.heightPx === null) {
        heightPx = null;
      } else if (typeof parsed.heightPx === "number" && Number.isFinite(parsed.heightPx)) {
        heightPx = clampHeight(parsed.heightPx);
      }
    }
    return { open, heightPx };
  } catch {
    return DEFAULT_SIDEBAR_RECENT;
  }
}

export function writeSidebarRecent(
  state: SidebarRecentState,
  storage: Pick<Storage, "setItem"> | null = typeof window === "undefined"
    ? null
    : window.localStorage,
) {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(
      SIDEBAR_RECENT_STORAGE_KEY,
      JSON.stringify({
        open: state.open,
        heightPx: state.heightPx === null ? null : clampHeight(state.heightPx),
      }),
    );
  } catch {
    // Ignore storage failures.
  }
}

export function clampSidebarRecentHeight(value: number): number {
  return clampHeight(value);
}
