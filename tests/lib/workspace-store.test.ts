import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { createWorkspaceStore } from "@/lib/auth/workspaces/store";

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function openStore() {
  const dir = mkdtempSync(path.join(tmpdir(), "brain-ws-"));
  dirs.push(dir);
  const db = new DatabaseSync(path.join(dir, "auth.sqlite"));
  return createWorkspaceStore(db);
}

describe("workspace store", () => {
  it("seeds invite-only policies and personal workspace", () => {
    const store = openStore();
    expect(store.getPolicies().signupMode).toBe("invite-only");
    const personal = store.ensurePersonalWorkspace("user-1");
    expect(personal.kind).toBe("personal");
    store.setActiveWorkspaceId("user-1", personal.id);
    expect(store.resolveActiveWorkspace("user-1").id).toBe(personal.id);
  });

  it("creates team workspace and isolates membership", () => {
    const store = openStore();
    store.ensurePersonalWorkspace("user-1");
    const team = store.createWorkspace({
      name: "Acme",
      kind: "team",
      ownerUserId: "user-1",
    });
    expect(store.getMembership(team.id, "user-1")).toBe("owner");
    expect(store.getMembership(team.id, "user-2")).toBeNull();
  });

  it("accepts and revokes invites", () => {
    const store = openStore();
    store.ensurePersonalWorkspace("owner");
    const team = store.createWorkspace({
      name: "Team",
      kind: "team",
      ownerUserId: "owner",
    });
    const invite = store.createInvite({
      workspaceId: team.id,
      createdByUserId: "owner",
      email: "member@example.com",
    });
    store.ensurePersonalWorkspace("member");
    const joined = store.acceptInvite(invite.token, "member", "member@example.com");
    expect(joined.id).toBe(team.id);
    expect(store.getMembership(team.id, "member")).toBe("member");

    const invite2 = store.createInvite({
      workspaceId: team.id,
      createdByUserId: "owner",
    });
    expect(store.revokeInvite(team.id, invite2.id, "owner")).toBe(true);
    expect(() => store.acceptInvite(invite2.token, "other", "other@example.com")).toThrow(
      /revoked|invalid/i,
    );
  });

  it("gates create workspace via policy", () => {
    const store = openStore();
    store.updatePolicies({ allowCreateWorkspace: false });
    expect(store.getPolicies().allowCreateWorkspace).toBe(false);
  });

  it("lists members and updates roles with guards", () => {
    const store = openStore();
    const team = store.createWorkspace({
      name: "Team",
      kind: "team",
      ownerUserId: "owner",
    });
    store.addMember(team.id, "member", "member");
    store.addMember(team.id, "admin", "admin");

    expect(store.listMembers(team.id)).toHaveLength(3);
    expect(
      store.updateMemberRole({
        workspaceId: team.id,
        actorUserId: "owner",
        targetUserId: "member",
        role: "admin",
      }).role,
    ).toBe("admin");

    expect(() =>
      store.updateMemberRole({
        workspaceId: team.id,
        actorUserId: "owner",
        targetUserId: "owner",
        role: "admin",
      }),
    ).toThrow(/owner/i);

    expect(() =>
      store.updateMemberRole({
        workspaceId: team.id,
        actorUserId: "admin",
        targetUserId: "owner",
        role: "member",
      }),
    ).toThrow(/owner/i);
  });

  it("removes members and blocks last-owner leave", () => {
    const store = openStore();
    const team = store.createWorkspace({
      name: "Team",
      kind: "team",
      ownerUserId: "owner",
    });
    store.addMember(team.id, "member", "member");
    store.addMember(team.id, "admin", "admin");
    store.addMember(team.id, "admin-2", "admin");

    store.removeMember({
      workspaceId: team.id,
      actorUserId: "admin",
      targetUserId: "member",
    });
    expect(store.getMembership(team.id, "member")).toBeNull();

    expect(() =>
      store.removeMember({
        workspaceId: team.id,
        actorUserId: "admin",
        targetUserId: "admin-2",
      }),
    ).toThrow(/cannot remove other admins/i);

    store.removeMember({
      workspaceId: team.id,
      actorUserId: "admin",
      targetUserId: "admin",
    });
    expect(store.getMembership(team.id, "admin")).toBeNull();

    expect(() =>
      store.removeMember({
        workspaceId: team.id,
        actorUserId: "owner",
        targetUserId: "owner",
      }),
    ).toThrow(/last workspace owner/i);

    const personal = store.ensurePersonalWorkspace("solo");
    expect(() =>
      store.removeMember({
        workspaceId: personal.id,
        actorUserId: "solo",
        targetUserId: "solo",
      }),
    ).toThrow(/personal/i);
  });
});
