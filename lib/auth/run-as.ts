export const BRAIN_RUN_AS_USER_HEADER = "x-brain-run-as-user";
export const BRAIN_WORKSPACE_HEADER = "x-brain-workspace-id";

export function readRunAsUserId(headers: Headers): string | null {
  const value = headers.get(BRAIN_RUN_AS_USER_HEADER)?.trim();
  return value && value.length > 0 ? value : null;
}

export function readWorkspaceId(headers: Headers): string | null {
  const value = headers.get(BRAIN_WORKSPACE_HEADER)?.trim();
  return value && value.length > 0 ? value : null;
}
