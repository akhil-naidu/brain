export const SIDEBAR_EXPANDED_STORAGE_KEY = "brain.sidebar-expanded.v1";

export function readSidebarExpanded(
  storage: Pick<Storage, "getItem"> | null = typeof window === "undefined"
    ? null
    : window.localStorage,
): boolean {
  if (!storage) {
    return true;
  }
  try {
    const raw = storage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY);
    if (raw === "0" || raw === "false") {
      return false;
    }
    if (raw === "1" || raw === "true") {
      return true;
    }
  } catch {
    // Ignore storage failures.
  }
  return true;
}

export function writeSidebarExpanded(
  expanded: boolean,
  storage: Pick<Storage, "setItem"> | null = typeof window === "undefined"
    ? null
    : window.localStorage,
) {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, expanded ? "1" : "0");
  } catch {
    // Ignore storage failures.
  }
}
