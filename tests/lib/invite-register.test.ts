import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerWithInvite } from "@/lib/auth/invite-register";
import {
  countAuthUsers,
  ensureAuthReady,
  firstAuthUserId,
  getAuth,
  getWorkspaceStore,
  resetBrainAuthForTests,
  runWithBootstrapSignup,
} from "@/lib/auth/server";

async function bootstrapOwner() {
  await runWithBootstrapSignup(async () => {
    await getAuth().api.signUpEmail({
      body: {
        email: "owner@brain.local",
        password: "password12345",
        name: "owner",
      },
    });
  });
  const ownerUserId = firstAuthUserId();
  if (!ownerUserId) {
    throw new Error("Expected bootstrap user id.");
  }
  const store = getWorkspaceStore();
  store.addInstanceAdmin(ownerUserId);
  store.ensurePersonalWorkspace(ownerUserId);
  const team = store.createWorkspace({
    name: "Team",
    kind: "team",
    ownerUserId,
  });
  return { ownerUserId, team, store };
}

describe("invite register", () => {
  let dir: string;
  let previousDbPath: string | undefined;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "brain-invite-"));
    previousDbPath = process.env["BRAIN_AUTH_DB_PATH"];
    process.env["BRAIN_AUTH_DB_PATH"] = path.join(dir, "auth.sqlite");
    process.env["BETTER_AUTH_SECRET"] =
      process.env["BETTER_AUTH_SECRET"] ?? "test-only-better-auth-secret-32chars!!";
    resetBrainAuthForTests();
    await ensureAuthReady();
  });

  afterEach(() => {
    resetBrainAuthForTests();
    if (previousDbPath === undefined) {
      delete process.env["BRAIN_AUTH_DB_PATH"];
    } else {
      process.env["BRAIN_AUTH_DB_PATH"] = previousDbPath;
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates a user under invite-only and joins the workspace", async () => {
    expect(getWorkspaceStore().getPolicies().signupMode).toBe("invite-only");
    const { ownerUserId, team, store } = await bootstrapOwner();
    const invite = store.createInvite({
      workspaceId: team.id,
      createdByUserId: ownerUserId,
      email: "member@example.com",
    });

    await expect(
      getAuth().api.signUpEmail({
        body: {
          email: "stranger@example.com",
          password: "password12345",
          name: "stranger",
        },
      }),
    ).rejects.toThrow(/Signup is disabled/i);

    const registered = await registerWithInvite({
      token: invite.token,
      email: "member@example.com",
      password: "password12345",
    });
    expect(registered.email).toBe("member@example.com");
    expect(registered.workspaceId).toBe(team.id);
    expect(countAuthUsers()).toBe(2);
    expect(store.getMembership(team.id, registered.id)).toBe("member");
  });

  it("rejects invalid invite tokens", async () => {
    await bootstrapOwner();
    await expect(
      registerWithInvite({
        token: "not-a-real-token",
        email: "member@example.com",
        password: "password12345",
      }),
    ).rejects.toThrow(/invalid|revoked/i);
  });
});
