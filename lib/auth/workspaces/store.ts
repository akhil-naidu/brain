import { randomBytes, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { ensureBrainSchema } from "@/lib/db/schema";
import { countFromDbRow } from "@/lib/db/rows";
import {
  isWorkspaceAdminRole,
  type InstancePolicies,
  type SignupMode,
  type Workspace,
  type WorkspaceInvite,
  type WorkspaceListItem,
  type WorkspaceMember,
  type WorkspaceRole,
} from "@/lib/auth/workspaces/types";

type PgRow = Record<string, unknown>;

const DEFAULT_POLICIES: InstancePolicies = {
  signupMode: "invite-only",
  autoPersonalWorkspace: true,
  allowCreateWorkspace: true,
  allowForgotPassword: true,
};

function nowIso(): string {
  return new Date().toISOString();
}

function requireString(row: PgRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected string column ${key}`);
  }
  return value;
}

function optionalString(row: PgRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected string or null column ${key}`);
  }
  return value;
}

function asBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "t" || value === "true") return true;
  return false;
}

function parseSignupMode(value: string): SignupMode {
  if (value === "open" || value === "invite-only" || value === "sso-only") {
    return value;
  }
  return "invite-only";
}

function parseRole(value: string): WorkspaceRole {
  if (value === "owner" || value === "admin" || value === "member") {
    return value;
  }
  return "member";
}

function toWorkspace(row: PgRow): Workspace {
  const kindRaw = requireString(row, "kind");
  return {
    id: requireString(row, "id"),
    name: requireString(row, "name"),
    kind: kindRaw === "personal" ? "personal" : "team",
    createdAt: requireString(row, "created_at"),
  };
}

export async function ensureWorkspaceSchema(pool: Pool): Promise<void> {
  await ensureBrainSchema(pool);
}

export function createWorkspaceStore(pool: Pool) {
  async function getPolicies(): Promise<InstancePolicies> {
    const result = await pool.query<PgRow>("SELECT * FROM brain_instance_policy WHERE id = 1");
    const row = result.rows[0];
    if (!row) {
      return DEFAULT_POLICIES;
    }
    return {
      signupMode: parseSignupMode(requireString(row, "signup_mode")),
      autoPersonalWorkspace: asBool(row["auto_personal_workspace"]),
      allowCreateWorkspace: asBool(row["allow_create_workspace"]),
      allowForgotPassword: asBool(row["allow_forgot_password"]),
    };
  }

  async function updatePolicies(patch: Partial<InstancePolicies>): Promise<InstancePolicies> {
    const current = await getPolicies();
    const next: InstancePolicies = {
      signupMode: patch.signupMode ?? current.signupMode,
      autoPersonalWorkspace: patch.autoPersonalWorkspace ?? current.autoPersonalWorkspace,
      allowCreateWorkspace: patch.allowCreateWorkspace ?? current.allowCreateWorkspace,
      allowForgotPassword: patch.allowForgotPassword ?? current.allowForgotPassword,
    };
    // Upsert: a bare UPDATE no-ops when the seed row is missing (e.g. after TRUNCATE
    // while the process has already run ensureBrainSchema once).
    await pool.query(
      `INSERT INTO brain_instance_policy (
         id, signup_mode, auto_personal_workspace, allow_create_workspace, allow_forgot_password
       ) VALUES (1, $1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         signup_mode = EXCLUDED.signup_mode,
         auto_personal_workspace = EXCLUDED.auto_personal_workspace,
         allow_create_workspace = EXCLUDED.allow_create_workspace,
         allow_forgot_password = EXCLUDED.allow_forgot_password`,
      [
        next.signupMode,
        next.autoPersonalWorkspace,
        next.allowCreateWorkspace,
        next.allowForgotPassword,
      ],
    );
    return next;
  }

  async function isInstanceAdmin(userId: string): Promise<boolean> {
    const result = await pool.query("SELECT user_id FROM brain_instance_admin WHERE user_id = $1", [
      userId,
    ]);
    return result.rows.length > 0;
  }

  async function addInstanceAdmin(userId: string): Promise<void> {
    await pool.query(
      "INSERT INTO brain_instance_admin (user_id) VALUES ($1) ON CONFLICT DO NOTHING",
      [userId],
    );
  }

  async function getMembership(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const result = await pool.query<PgRow>(
      "SELECT role FROM brain_workspace_member WHERE workspace_id = $1 AND user_id = $2",
      [workspaceId, userId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return parseRole(requireString(row, "role"));
  }

  async function listWorkspacesForUser(userId: string): Promise<readonly WorkspaceListItem[]> {
    const result = await pool.query<PgRow>(
      `SELECT w.id, w.name, w.kind, w.created_at, m.role
       FROM brain_workspace w
       INNER JOIN brain_workspace_member m ON m.workspace_id = w.id
       WHERE m.user_id = $1
       ORDER BY w.kind = 'personal' DESC, w.created_at ASC`,
      [userId],
    );
    return result.rows.map((row) => {
      const workspace = toWorkspace(row);
      return {
        id: workspace.id,
        name: workspace.name,
        kind: workspace.kind,
        createdAt: workspace.createdAt,
        role: parseRole(requireString(row, "role")),
      };
    });
  }

  async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
    const result = await pool.query<PgRow>("SELECT * FROM brain_workspace WHERE id = $1", [
      workspaceId,
    ]);
    const row = result.rows[0];
    return row ? toWorkspace(row) : null;
  }

  async function createWorkspace(input: {
    readonly name: string;
    readonly kind: "personal" | "team";
    readonly ownerUserId: string;
  }): Promise<Workspace> {
    const id = randomUUID();
    const createdAt = nowIso();
    const name = input.name.trim() || (input.kind === "personal" ? "Personal" : "Workspace");
    await pool.query(
      "INSERT INTO brain_workspace (id, name, kind, created_at) VALUES ($1, $2, $3, $4)",
      [id, name, input.kind, createdAt],
    );
    await pool.query(
      `INSERT INTO brain_workspace_member (workspace_id, user_id, role, created_at)
       VALUES ($1, $2, 'owner', $3)`,
      [id, input.ownerUserId, createdAt],
    );
    return { id, name, kind: input.kind, createdAt };
  }

  async function findPersonalWorkspace(userId: string): Promise<Workspace | null> {
    const result = await pool.query<PgRow>(
      `SELECT w.*
       FROM brain_workspace w
       INNER JOIN brain_workspace_member m ON m.workspace_id = w.id
       WHERE m.user_id = $1 AND w.kind = 'personal'
       ORDER BY w.created_at ASC
       LIMIT 1`,
      [userId],
    );
    const row = result.rows[0];
    return row ? toWorkspace(row) : null;
  }

  async function ensurePersonalWorkspace(userId: string): Promise<Workspace> {
    const existing = await findPersonalWorkspace(userId);
    if (existing) return existing;
    return createWorkspace({ name: "Personal", kind: "personal", ownerUserId: userId });
  }

  async function getActiveWorkspaceId(userId: string): Promise<string | null> {
    const result = await pool.query<PgRow>(
      "SELECT workspace_id FROM brain_user_active_workspace WHERE user_id = $1",
      [userId],
    );
    const row = result.rows[0];
    const workspaceId = row ? optionalString(row, "workspace_id") : null;
    if (!workspaceId) return null;
    if (!(await getMembership(workspaceId, userId))) return null;
    return workspaceId;
  }

  async function setActiveWorkspaceId(userId: string, workspaceId: string): Promise<void> {
    if (!(await getMembership(workspaceId, userId))) {
      throw new Error("Not a member of that workspace.");
    }
    await pool.query(
      `INSERT INTO brain_user_active_workspace (user_id, workspace_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET workspace_id = EXCLUDED.workspace_id`,
      [userId, workspaceId],
    );
  }

  async function resolveActiveWorkspace(userId: string): Promise<Workspace> {
    const policies = await getPolicies();
    if (policies.autoPersonalWorkspace) {
      await ensurePersonalWorkspace(userId);
    }
    const activeId = await getActiveWorkspaceId(userId);
    if (activeId) {
      const workspace = await getWorkspace(activeId);
      if (workspace) return workspace;
    }
    const memberships = await listWorkspacesForUser(userId);
    const first = memberships[0];
    if (!first) {
      if (!policies.autoPersonalWorkspace) {
        throw new Error("No workspace membership for user.");
      }
      const personal = await ensurePersonalWorkspace(userId);
      await setActiveWorkspaceId(userId, personal.id);
      return personal;
    }
    await setActiveWorkspaceId(userId, first.id);
    return first;
  }

  async function addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO brain_workspace_member (workspace_id, user_id, role, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [workspaceId, userId, role, nowIso()],
    );
  }

  async function countOwners(workspaceId: string): Promise<number> {
    const result = await pool.query<PgRow>(
      `SELECT COUNT(*) AS count FROM brain_workspace_member
       WHERE workspace_id = $1 AND role = 'owner'`,
      [workspaceId],
    );
    const row = result.rows[0];
    return countFromDbRow(row);
  }

  async function listMembers(workspaceId: string): Promise<readonly WorkspaceMember[]> {
    const orderBy = `
      ORDER BY
        CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
        m.created_at ASC`;
    let rows: PgRow[];
    try {
      const result = await pool.query<PgRow>(
        `SELECT m.user_id AS user_id, m.role AS role, m.created_at AS created_at,
                u.email AS email, u.name AS name
         FROM brain_workspace_member m
         LEFT JOIN "user" u ON u.id = m.user_id
         WHERE m.workspace_id = $1
         ${orderBy}`,
        [workspaceId],
      );
      rows = result.rows;
    } catch {
      const result = await pool.query<PgRow>(
        `SELECT m.user_id AS user_id, m.role AS role, m.created_at AS created_at,
                NULL AS email, NULL AS name
         FROM brain_workspace_member m
         WHERE m.workspace_id = $1
         ${orderBy}`,
        [workspaceId],
      );
      rows = result.rows;
    }
    return rows.map((row) => ({
      userId: requireString(row, "user_id"),
      role: parseRole(requireString(row, "role")),
      email: optionalString(row, "email"),
      name: optionalString(row, "name"),
      createdAt: requireString(row, "created_at"),
    }));
  }

  async function clearActiveWorkspaceIfNeeded(userId: string, workspaceId: string): Promise<void> {
    const active = await getActiveWorkspaceId(userId);
    if (active === workspaceId) {
      await pool.query("DELETE FROM brain_user_active_workspace WHERE user_id = $1", [userId]);
    }
  }

  async function updateMemberRole(input: {
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly targetUserId: string;
    readonly role: WorkspaceRole;
  }): Promise<WorkspaceMember> {
    const workspace = await getWorkspace(input.workspaceId);
    if (!workspace) throw new Error("Workspace no longer exists.");
    if (workspace.kind === "personal") {
      throw new Error("Cannot change members on a personal workspace.");
    }
    if (input.role === "owner") {
      throw new Error("Cannot assign owner through member role updates.");
    }
    const actorRole = await getMembership(input.workspaceId, input.actorUserId);
    if (!actorRole || !isWorkspaceAdminRole(actorRole)) {
      throw new Error("Only workspace owners or admins can change roles.");
    }
    const targetRole = await getMembership(input.workspaceId, input.targetUserId);
    if (!targetRole) throw new Error("User is not a member of this workspace.");
    if (targetRole === "owner") throw new Error("Cannot change an owner's role.");
    if (
      actorRole === "admin" &&
      targetRole === "admin" &&
      input.actorUserId !== input.targetUserId
    ) {
      throw new Error("Admins cannot change another admin's role.");
    }
    await addMember(input.workspaceId, input.targetUserId, input.role);
    const members = await listMembers(input.workspaceId);
    const updated = members.find((m) => m.userId === input.targetUserId);
    if (!updated) throw new Error("User is not a member of this workspace.");
    return updated;
  }

  async function transferOwnership(input: {
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly targetUserId: string;
  }): Promise<void> {
    const workspace = await getWorkspace(input.workspaceId);
    if (!workspace) throw new Error("Workspace no longer exists.");
    if (workspace.kind === "personal") {
      throw new Error("Cannot transfer ownership of a personal workspace.");
    }
    if (input.actorUserId === input.targetUserId) {
      throw new Error("Already the workspace owner.");
    }
    const actorRole = await getMembership(input.workspaceId, input.actorUserId);
    if (actorRole !== "owner") {
      throw new Error("Only the workspace owner can transfer ownership.");
    }
    const targetRole = await getMembership(input.workspaceId, input.targetUserId);
    if (!targetRole) throw new Error("User is not a member of this workspace.");
    await addMember(input.workspaceId, input.targetUserId, "owner");
    await addMember(input.workspaceId, input.actorUserId, "admin");
  }

  async function removeMember(input: {
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly targetUserId: string;
  }): Promise<void> {
    const workspace = await getWorkspace(input.workspaceId);
    if (!workspace) throw new Error("Workspace no longer exists.");
    if (workspace.kind === "personal") {
      throw new Error("Cannot change members on a personal workspace.");
    }
    const targetRole = await getMembership(input.workspaceId, input.targetUserId);
    if (!targetRole) throw new Error("User is not a member of this workspace.");
    const isSelf = input.actorUserId === input.targetUserId;
    if (!isSelf) {
      const actorRole = await getMembership(input.workspaceId, input.actorUserId);
      if (!actorRole || !isWorkspaceAdminRole(actorRole)) {
        throw new Error("Only workspace owners or admins can remove members.");
      }
      if (targetRole === "owner") throw new Error("Cannot remove a workspace owner.");
      if (actorRole === "admin" && targetRole === "admin") {
        throw new Error("Admins cannot remove other admins.");
      }
    }
    if (targetRole === "owner" && (await countOwners(input.workspaceId)) <= 1) {
      throw new Error("Cannot remove the last workspace owner.");
    }
    await pool.query(
      "DELETE FROM brain_workspace_member WHERE workspace_id = $1 AND user_id = $2",
      [input.workspaceId, input.targetUserId],
    );
    await clearActiveWorkspaceIfNeeded(input.targetUserId, input.workspaceId);
  }

  async function createInvite(input: {
    readonly workspaceId: string;
    readonly createdByUserId: string;
    readonly email?: string | null;
    readonly role?: WorkspaceRole;
    readonly expiresInMs?: number;
  }): Promise<WorkspaceInvite> {
    const role = await getMembership(input.workspaceId, input.createdByUserId);
    if (!role || !isWorkspaceAdminRole(role)) {
      throw new Error("Only workspace owners or admins can create invites.");
    }
    const inviteRole = input.role ?? "member";
    if (inviteRole === "owner") throw new Error("Cannot invite as owner.");
    const id = randomUUID();
    const token = randomBytes(24).toString("base64url");
    const createdAt = nowIso();
    const expiresAt = new Date(
      Date.now() + (input.expiresInMs ?? 7 * 24 * 60 * 60 * 1000),
    ).toISOString();
    const email = input.email?.trim().toLowerCase() || null;
    await pool.query(
      `INSERT INTO brain_workspace_invite
        (id, workspace_id, token, email, role, created_by_user_id, expires_at, revoked_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8)`,
      [
        id,
        input.workspaceId,
        token,
        email,
        inviteRole,
        input.createdByUserId,
        expiresAt,
        createdAt,
      ],
    );
    return {
      id,
      workspaceId: input.workspaceId,
      token,
      email,
      role: inviteRole,
      createdByUserId: input.createdByUserId,
      expiresAt,
      revokedAt: null,
      createdAt,
    };
  }

  async function listInvites(workspaceId: string): Promise<readonly WorkspaceInvite[]> {
    const result = await pool.query<PgRow>(
      `SELECT * FROM brain_workspace_invite
       WHERE workspace_id = $1 AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [workspaceId],
    );
    return result.rows.map((row) => ({
      id: requireString(row, "id"),
      workspaceId: requireString(row, "workspace_id"),
      token: requireString(row, "token"),
      email: optionalString(row, "email"),
      role: parseRole(requireString(row, "role")),
      createdByUserId: requireString(row, "created_by_user_id"),
      expiresAt: requireString(row, "expires_at"),
      revokedAt: optionalString(row, "revoked_at"),
      createdAt: requireString(row, "created_at"),
    }));
  }

  async function getInviteByToken(token: string): Promise<WorkspaceInvite | null> {
    const result = await pool.query<PgRow>(
      "SELECT * FROM brain_workspace_invite WHERE token = $1",
      [token],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: requireString(row, "id"),
      workspaceId: requireString(row, "workspace_id"),
      token: requireString(row, "token"),
      email: optionalString(row, "email"),
      role: parseRole(requireString(row, "role")),
      createdByUserId: requireString(row, "created_by_user_id"),
      expiresAt: requireString(row, "expires_at"),
      revokedAt: optionalString(row, "revoked_at"),
      createdAt: requireString(row, "created_at"),
    };
  }

  async function revokeInvite(
    workspaceId: string,
    inviteId: string,
    actorUserId: string,
  ): Promise<boolean> {
    const role = await getMembership(workspaceId, actorUserId);
    if (!role || !isWorkspaceAdminRole(role)) {
      throw new Error("Only workspace owners or admins can revoke invites.");
    }
    const result = await pool.query(
      `UPDATE brain_workspace_invite
       SET revoked_at = $1
       WHERE id = $2 AND workspace_id = $3 AND revoked_at IS NULL`,
      [nowIso(), inviteId, workspaceId],
    );
    return Number(result.rowCount) > 0;
  }

  async function acceptInvite(
    token: string,
    userId: string,
    userEmail: string,
  ): Promise<Workspace> {
    const invite = await getInviteByToken(token);
    if (!invite || invite.revokedAt) throw new Error("Invite is invalid or revoked.");
    if (Date.parse(invite.expiresAt) < Date.now()) throw new Error("Invite has expired.");
    if (invite.email && invite.email !== userEmail.trim().toLowerCase()) {
      throw new Error("Invite email does not match this account.");
    }
    const workspace = await getWorkspace(invite.workspaceId);
    if (!workspace) throw new Error("Workspace no longer exists.");
    await addMember(invite.workspaceId, userId, invite.role === "owner" ? "member" : invite.role);
    return workspace;
  }

  return {
    getPolicies,
    updatePolicies,
    isInstanceAdmin,
    addInstanceAdmin,
    getMembership,
    listWorkspacesForUser,
    getWorkspace,
    createWorkspace,
    findPersonalWorkspace,
    ensurePersonalWorkspace,
    getActiveWorkspaceId,
    setActiveWorkspaceId,
    resolveActiveWorkspace,
    addMember,
    listMembers,
    updateMemberRole,
    transferOwnership,
    removeMember,
    createInvite,
    listInvites,
    getInviteByToken,
    revokeInvite,
    acceptInvite,
  };
}

export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>;
