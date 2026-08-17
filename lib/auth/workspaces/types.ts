export type WorkspaceRole = "owner" | "admin" | "member";

export type SignupMode = "open" | "invite-only" | "sso-only";

export const AGENT_SAFETY_POSTURES = ["strict", "auto", "dangerous"] as const;

export type AgentSafetyPosture = (typeof AGENT_SAFETY_POSTURES)[number];

export const DEFAULT_AGENT_SAFETY_POSTURE: AgentSafetyPosture = "auto";

export function parseAgentSafetyPosture(value: unknown): AgentSafetyPosture {
  if (value === "strict" || value === "auto" || value === "dangerous") {
    return value;
  }
  return DEFAULT_AGENT_SAFETY_POSTURE;
}

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
  /** Host-wide HITL posture. Default auto matches today’s write-approval split. */
  readonly agentSafetyPosture: AgentSafetyPosture;
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
