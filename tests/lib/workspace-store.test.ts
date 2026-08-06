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
});
