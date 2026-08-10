let pendingProjectId: string | null = null;

export function stashPendingChatProjectId(projectId: string | null): void {
  pendingProjectId = projectId?.trim() || null;
}

/** Returns and clears the project id for the next newly created chat. */
export function takePendingChatProjectId(): string | null {
  const value = pendingProjectId;
  pendingProjectId = null;
  return value;
}
