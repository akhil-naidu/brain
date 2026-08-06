import { randomBytes, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
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

type SqlRow = Record<string, null | number | bigint | string | Uint8Array>;

const DEFAULT_POLICIES: InstancePolicies = {
  signupMode: "invite-only",
  autoPersonalWorkspace: true,
  allowCreateWorkspace: true,
};

function nowIso(): string {
  return new Date().toISOString();
}

function requireString(row: SqlRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected string column ${key}`);
  }
  return value;
}

function optionalString(row: SqlRow, key: string): string | null {
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
  return value === 1 || value === true || value === "1";
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

function toWorkspace(row: SqlRow): Workspace {
  const kindRaw = requireString(row, "kind");
  return {
    id: requireString(row, "id"),
    name: requireString(row, "name"),
    kind: kindRaw === "personal" ? "personal" : "team",
    createdAt: requireString(row, "created_at"),
  };
}

export function ensureWorkspaceSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS brain_workspace (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('personal', 'team')),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS brain_workspace_member (
      workspace_id TEXT NOT NULL REFERENCES brain_workspace(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
      created_at TEXT NOT NULL,
      PRIMARY KEY (workspace_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS brain_workspace_member_user_idx
      ON brain_workspace_member(user_id);
    CREATE TABLE IF NOT EXISTS brain_instance_policy (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      signup_mode TEXT NOT NULL,
      auto_personal_workspace INTEGER NOT NULL,
      allow_create_workspace INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS brain_instance_admin (
      user_id TEXT PRIMARY KEY NOT NULL
    );
    CREATE TABLE IF NOT EXISTS brain_user_active_workspace (
      user_id TEXT PRIMARY KEY NOT NULL,
      workspace_id TEXT NOT NULL REFERENCES brain_workspace(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS brain_workspace_invite (
      id TEXT PRIMARY KEY NOT NULL,
      workspace_id TEXT NOT NULL REFERENCES brain_workspace(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      email TEXT,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
      created_by_user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS brain_workspace_invite_workspace_idx
      ON brain_workspace_invite(workspace_id);
  `);

  const policy = db.prepare("SELECT id FROM brain_instance_policy WHERE id = 1").get() as
    SqlRow | undefined;
  if (!policy) {
    db.prepare(
      `INSERT INTO brain_instance_policy
        (id, signup_mode, auto_personal_workspace, allow_create_workspace)
       VALUES (1, ?, ?, ?)`,
    ).run(
      DEFAULT_POLICIES.signupMode,
      DEFAULT_POLICIES.autoPersonalWorkspace ? 1 : 0,
      DEFAULT_POLICIES.allowCreateWorkspace ? 1 : 0,
    );
  }
}

export function createWorkspaceStore(db: DatabaseSync) {
  ensureWorkspaceSchema(db);

  function getPolicies(): InstancePolicies {
    const row = db.prepare("SELECT * FROM brain_instance_policy WHERE id = 1").get() as
      SqlRow | undefined;
    if (!row) {
      return DEFAULT_POLICIES;
    }
    return {
      signupMode: parseSignupMode(requireString(row, "signup_mode")),
      autoPersonalWorkspace: asBool(row["auto_personal_workspace"]),
      allowCreateWorkspace: asBool(row["allow_create_workspace"]),
    };
  }

  function updatePolicies(patch: Partial<InstancePolicies>): InstancePolicies {
    const current = getPolicies();
    const next: InstancePolicies = {
      signupMode: patch.signupMode ?? current.signupMode,
      autoPersonalWorkspace: patch.autoPersonalWorkspace ?? current.autoPersonalWorkspace,
      allowCreateWorkspace: patch.allowCreateWorkspace ?? current.allowCreateWorkspace,
    };
    db.prepare(
      `UPDATE brain_instance_policy
       SET signup_mode = ?, auto_personal_workspace = ?, allow_create_workspace = ?
       WHERE id = 1`,
    ).run(next.signupMode, next.autoPersonalWorkspace ? 1 : 0, next.allowCreateWorkspace ? 1 : 0);
    return next;
  }

  function isInstanceAdmin(userId: string): boolean {
    const row = db
      .prepare("SELECT user_id FROM brain_instance_admin WHERE user_id = ?")
      .get(userId) as SqlRow | undefined;
    return Boolean(row);
  }

  function addInstanceAdmin(userId: string): void {
    db.prepare("INSERT OR IGNORE INTO brain_instance_admin (user_id) VALUES (?)").run(userId);
  }

  function getMembership(workspaceId: string, userId: string): WorkspaceRole | null {
    const row = db
      .prepare("SELECT role FROM brain_workspace_member WHERE workspace_id = ? AND user_id = ?")
      .get(workspaceId, userId) as SqlRow | undefined;
    if (!row) {
      return null;
    }
    return parseRole(requireString(row, "role"));
  }

  function listWorkspacesForUser(userId: string): readonly WorkspaceListItem[] {
    const rows = db
      .prepare(
        `SELECT w.id, w.name, w.kind, w.created_at, m.role
         FROM brain_workspace w
         INNER JOIN brain_workspace_member m ON m.workspace_id = w.id
         WHERE m.user_id = ?
         ORDER BY w.kind = 'personal' DESC, w.created_at ASC`,
      )
      .all(userId) as SqlRow[];
    return rows.map((row) => {
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

  function getWorkspace(workspaceId: string): Workspace | null {
    const row = db.prepare("SELECT * FROM brain_workspace WHERE id = ?").get(workspaceId) as
      SqlRow | undefined;
    return row ? toWorkspace(row) : null;
  }

  function createWorkspace(input: {
    readonly name: string;
    readonly kind: "personal" | "team";
    readonly ownerUserId: string;
  }): Workspace {
    const id = randomUUID();
    const createdAt = nowIso();
    const name = input.name.trim() || (input.kind === "personal" ? "Personal" : "Workspace");
    db.prepare("INSERT INTO brain_workspace (id, name, kind, created_at) VALUES (?, ?, ?, ?)").run(
      id,
      name,
      input.kind,
      createdAt,
    );
    db.prepare(
      `INSERT INTO brain_workspace_member (workspace_id, user_id, role, created_at)
       VALUES (?, ?, 'owner', ?)`,
    ).run(id, input.ownerUserId, createdAt);
    return { id, name, kind: input.kind, createdAt };
  }

  function findPersonalWorkspace(userId: string): Workspace | null {
    const row = db
      .prepare(
        `SELECT w.*
         FROM brain_workspace w
         INNER JOIN brain_workspace_member m ON m.workspace_id = w.id
         WHERE m.user_id = ? AND w.kind = 'personal'
         ORDER BY w.created_at ASC
         LIMIT 1`,
      )
      .get(userId) as SqlRow | undefined;
    return row ? toWorkspace(row) : null;
  }

  function ensurePersonalWorkspace(userId: string): Workspace {
    const existing = findPersonalWorkspace(userId);
    if (existing) {
      return existing;
    }
    return createWorkspace({
      name: "Personal",
      kind: "personal",
      ownerUserId: userId,
    });
  }

  function getActiveWorkspaceId(userId: string): string | null {
    const row = db
      .prepare("SELECT workspace_id FROM brain_user_active_workspace WHERE user_id = ?")
      .get(userId) as SqlRow | undefined;
    const workspaceId = optionalString(row ?? {}, "workspace_id");
    if (!workspaceId) {
      return null;
    }
    if (!getMembership(workspaceId, userId)) {
      return null;
    }
    return workspaceId;
  }

  function setActiveWorkspaceId(userId: string, workspaceId: string): void {
    if (!getMembership(workspaceId, userId)) {
      throw new Error("Not a member of that workspace.");
    }
    db.prepare(
      `INSERT INTO brain_user_active_workspace (user_id, workspace_id)
       VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET workspace_id = excluded.workspace_id`,
    ).run(userId, workspaceId);
  }

  function resolveActiveWorkspace(userId: string): Workspace {
    const policies = getPolicies();
    if (policies.autoPersonalWorkspace) {
      ensurePersonalWorkspace(userId);
    }
    const activeId = getActiveWorkspaceId(userId);
    if (activeId) {
      const workspace = getWorkspace(activeId);
      if (workspace) {
        return workspace;
      }
    }
    const memberships = listWorkspacesForUser(userId);
    const first = memberships[0];
    if (!first) {
      if (!policies.autoPersonalWorkspace) {
        throw new Error("No workspace membership for user.");
      }
      const personal = ensurePersonalWorkspace(userId);
      setActiveWorkspaceId(userId, personal.id);
      return personal;
    }
    setActiveWorkspaceId(userId, first.id);
    return first;
  }

  function addMember(workspaceId: string, userId: string, role: WorkspaceRole): void {
    db.prepare(
      `INSERT INTO brain_workspace_member (workspace_id, user_id, role, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(workspace_id, user_id) DO UPDATE SET role = excluded.role`,
    ).run(workspaceId, userId, role, nowIso());
  }

  function countOwners(workspaceId: string): number {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS count FROM brain_workspace_member
         WHERE workspace_id = ? AND role = 'owner'`,
      )
      .get(workspaceId) as SqlRow | undefined;
    const value = row?.["count"];
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "bigint") {
      return Number(value);
    }
    return 0;
  }

  function listMembers(workspaceId: string): readonly WorkspaceMember[] {
    const orderBy = `
      ORDER BY
        CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
        m.created_at ASC`;
    let rows: SqlRow[];
    try {
      rows = db
        .prepare(
          `SELECT m.user_id AS user_id, m.role AS role, m.created_at AS created_at,
                  u.email AS email, u.name AS name
           FROM brain_workspace_member m
           LEFT JOIN user u ON u.id = m.user_id
           WHERE m.workspace_id = ?
           ${orderBy}`,
        )
        .all(workspaceId);
    } catch {
      rows = db
        .prepare(
          `SELECT m.user_id AS user_id, m.role AS role, m.created_at AS created_at,
                  NULL AS email, NULL AS name
           FROM brain_workspace_member m
           WHERE m.workspace_id = ?
           ${orderBy}`,
        )
        .all(workspaceId);
    }
    return rows.map((row) => ({
      userId: requireString(row, "user_id"),
      role: parseRole(requireString(row, "role")),
      email: optionalString(row, "email"),
      name: optionalString(row, "name"),
      createdAt: requireString(row, "created_at"),
    }));
  }

  function clearActiveWorkspaceIfNeeded(userId: string, workspaceId: string): void {
    const active = getActiveWorkspaceId(userId);
    if (active === workspaceId) {
      db.prepare("DELETE FROM brain_user_active_workspace WHERE user_id = ?").run(userId);
    }
  }

  function updateMemberRole(input: {
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly targetUserId: string;
    readonly role: WorkspaceRole;
  }): WorkspaceMember {
    const workspace = getWorkspace(input.workspaceId);
    if (!workspace) {
      throw new Error("Workspace no longer exists.");
    }
    if (workspace.kind === "personal") {
      throw new Error("Cannot change members on a personal workspace.");
    }
    if (input.role === "owner") {
      throw new Error("Cannot assign owner through member role updates.");
    }
    const actorRole = getMembership(input.workspaceId, input.actorUserId);
    if (!actorRole || !isWorkspaceAdminRole(actorRole)) {
      throw new Error("Only workspace owners or admins can change roles.");
    }
    const targetRole = getMembership(input.workspaceId, input.targetUserId);
    if (!targetRole) {
      throw new Error("User is not a member of this workspace.");
    }
    if (targetRole === "owner") {
      throw new Error("Cannot change an owner's role.");
    }
    if (
      actorRole === "admin" &&
      targetRole === "admin" &&
      input.actorUserId !== input.targetUserId
    ) {
      throw new Error("Admins cannot change another admin's role.");
    }
    addMember(input.workspaceId, input.targetUserId, input.role);
    const updated = listMembers(input.workspaceId).find(
      (member) => member.userId === input.targetUserId,
    );
    if (!updated) {
      throw new Error("User is not a member of this workspace.");
    }
    return updated;
  }

  function removeMember(input: {
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly targetUserId: string;
  }): void {
    const workspace = getWorkspace(input.workspaceId);
    if (!workspace) {
      throw new Error("Workspace no longer exists.");
    }
    if (workspace.kind === "personal") {
      throw new Error("Cannot change members on a personal workspace.");
    }
    const targetRole = getMembership(input.workspaceId, input.targetUserId);
    if (!targetRole) {
      throw new Error("User is not a member of this workspace.");
    }
    const isSelf = input.actorUserId === input.targetUserId;
    if (!isSelf) {
      const actorRole = getMembership(input.workspaceId, input.actorUserId);
      if (!actorRole || !isWorkspaceAdminRole(actorRole)) {
        throw new Error("Only workspace owners or admins can remove members.");
      }
      if (targetRole === "owner") {
        throw new Error("Cannot remove a workspace owner.");
      }
      if (actorRole === "admin" && targetRole === "admin") {
        throw new Error("Admins cannot remove other admins.");
      }
    }
    if (targetRole === "owner" && countOwners(input.workspaceId) <= 1) {
      throw new Error("Cannot remove the last workspace owner.");
    }
    db.prepare("DELETE FROM brain_workspace_member WHERE workspace_id = ? AND user_id = ?").run(
      input.workspaceId,
      input.targetUserId,
    );
    clearActiveWorkspaceIfNeeded(input.targetUserId, input.workspaceId);
  }

  function createInvite(input: {
    readonly workspaceId: string;
    readonly createdByUserId: string;
    readonly email?: string | null;
    readonly role?: WorkspaceRole;
    readonly expiresInMs?: number;
  }): WorkspaceInvite {
    const role = getMembership(input.workspaceId, input.createdByUserId);
    if (!role || !isWorkspaceAdminRole(role)) {
      throw new Error("Only workspace owners or admins can create invites.");
    }
    const inviteRole = input.role ?? "member";
    if (inviteRole === "owner") {
      throw new Error("Cannot invite as owner.");
    }
    const id = randomUUID();
    const token = randomBytes(24).toString("base64url");
    const createdAt = nowIso();
    const expiresAt = new Date(
      Date.now() + (input.expiresInMs ?? 7 * 24 * 60 * 60 * 1000),
    ).toISOString();
    const email = input.email?.trim().toLowerCase() || null;
    db.prepare(
      `INSERT INTO brain_workspace_invite
        (id, workspace_id, token, email, role, created_by_user_id, expires_at, revoked_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    ).run(
      id,
      input.workspaceId,
      token,
      email,
      inviteRole,
      input.createdByUserId,
      expiresAt,
      createdAt,
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

  function listInvites(workspaceId: string): readonly WorkspaceInvite[] {
    const rows = db
      .prepare(
        `SELECT * FROM brain_workspace_invite
         WHERE workspace_id = ? AND revoked_at IS NULL
         ORDER BY created_at DESC`,
      )
      .all(workspaceId) as SqlRow[];
    return rows.map((row) => ({
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

  function getInviteByToken(token: string): WorkspaceInvite | null {
    const row = db.prepare("SELECT * FROM brain_workspace_invite WHERE token = ?").get(token) as
      SqlRow | undefined;
    if (!row) {
      return null;
    }
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

  function revokeInvite(workspaceId: string, inviteId: string, actorUserId: string): boolean {
    const role = getMembership(workspaceId, actorUserId);
    if (!role || !isWorkspaceAdminRole(role)) {
      throw new Error("Only workspace owners or admins can revoke invites.");
    }
    const result = db
      .prepare(
        `UPDATE brain_workspace_invite
         SET revoked_at = ?
         WHERE id = ? AND workspace_id = ? AND revoked_at IS NULL`,
      )
      .run(nowIso(), inviteId, workspaceId);
    return Number(result.changes) > 0;
  }

  function acceptInvite(token: string, userId: string, userEmail: string): Workspace {
    const invite = getInviteByToken(token);
    if (!invite || invite.revokedAt) {
      throw new Error("Invite is invalid or revoked.");
    }
    if (Date.parse(invite.expiresAt) < Date.now()) {
      throw new Error("Invite has expired.");
    }
    if (invite.email && invite.email !== userEmail.trim().toLowerCase()) {
      throw new Error("Invite email does not match this account.");
    }
    const workspace = getWorkspace(invite.workspaceId);
    if (!workspace) {
      throw new Error("Workspace no longer exists.");
    }
    addMember(invite.workspaceId, userId, invite.role === "owner" ? "member" : invite.role);
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
    removeMember,
    createInvite,
    listInvites,
    getInviteByToken,
    revokeInvite,
    acceptInvite,
  };
}

export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>;
