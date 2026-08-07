export type ConnectionSetupTarget = "workspace" | "host" | "none";

/**
 * Prefer workspace BYOA when the active member can manage it (personal/team
 * workspace admins). Fall back to host credentials only for the instance admin.
 * Callers that can manage both SHOULD let the user switch scope in the UI.
 */
export function resolveConnectionSetupTarget(input: {
  readonly workspaceCanManage: boolean | null | undefined;
  readonly hostCanManage: boolean | null | undefined;
}): ConnectionSetupTarget {
  if (input.workspaceCanManage) {
    return "workspace";
  }
  if (input.hostCanManage) {
    return "host";
  }
  return "none";
}

export function connectionSetupCanManageBoth(input: {
  readonly workspaceCanManage: boolean | null | undefined;
  readonly hostCanManage: boolean | null | undefined;
}): boolean {
  return Boolean(input.workspaceCanManage && input.hostCanManage);
}
