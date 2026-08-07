export type WorkspaceRole = "owner" | "admin" | "member";

export type SignupMode = "open" | "invite-only" | "sso-only";

export type Workspace = {
  readonly id: string;
  readonly name: string;
  readonly kind: "personal" | "team";
  readonly createdAt: string;
};

export type WorkspaceMembership = {
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: WorkspaceRole;
};

export type WorkspaceMember = {
  readonly userId: string;
  readonly role: WorkspaceRole;
  readonly email: string | null;
  readonly name: string | null;
  readonly createdAt: string;
};

export type WorkspaceListItem = Workspace & {
  readonly role: WorkspaceRole;
};

export type InstancePolicies = {
  readonly signupMode: SignupMode;
  readonly autoPersonalWorkspace: boolean;
  readonly allowCreateWorkspace: boolean;
  /** When false, self-serve forgot-password email is blocked; admins can still reset. */
  readonly allowForgotPassword: boolean;
};

export type WorkspaceInvite = {
  readonly id: string;
  readonly workspaceId: string;
  readonly token: string;
  readonly email: string | null;
  readonly role: WorkspaceRole;
  readonly createdByUserId: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly createdAt: string;
};

export function isWorkspaceAdminRole(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}
