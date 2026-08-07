export type ConnectionSetupTarget = "workspace" | "host" | "none";

/**
 * Prefer workspace BYOA when the active member can manage it (personal/team
 * workspace admins). Fall back to host credentials only for the instance admin.
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
