export const WORKSPACES_CHANGED_EVENT = "brain:workspaces-changed";

export function notifyWorkspacesChanged() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(WORKSPACES_CHANGED_EVENT));
}
