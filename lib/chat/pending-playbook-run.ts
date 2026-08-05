const PENDING_PLAYBOOK_RUN_KEY = "brain.pending-playbook-run.v1";

export function stashPendingPlaybookRun(prompt: string) {
  if (typeof window === "undefined") {
    return;
  }
  const trimmed = prompt.trim();
  if (!trimmed) {
    return;
  }
  try {
    window.sessionStorage.setItem(PENDING_PLAYBOOK_RUN_KEY, trimmed);
  } catch {
    // Ignore quota / private mode failures.
  }
}

/** Reads and clears a pending playbook prompt stashed before navigating to chat. */
export function takePendingPlaybookRun(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = window.sessionStorage.getItem(PENDING_PLAYBOOK_RUN_KEY);
    window.sessionStorage.removeItem(PENDING_PLAYBOOK_RUN_KEY);
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
