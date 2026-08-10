const PENDING_CHAT_PROJECT_KEY = "brain.pending-chat-project.v1";

export function stashPendingChatProjectId(projectId: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  const trimmed = projectId?.trim() || "";
  try {
    if (!trimmed) {
      window.sessionStorage.removeItem(PENDING_CHAT_PROJECT_KEY);
      return;
    }
    window.sessionStorage.setItem(PENDING_CHAT_PROJECT_KEY, trimmed);
  } catch {
    // Ignore quota / private mode failures.
  }
}

/** Returns and clears the project id for the next newly created chat. */
export function takePendingChatProjectId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = window.sessionStorage.getItem(PENDING_CHAT_PROJECT_KEY);
    window.sessionStorage.removeItem(PENDING_CHAT_PROJECT_KEY);
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
