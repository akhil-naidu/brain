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
import { getPool } from "@/lib/db/pool";

const DB_URL = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

const describeOrSkip = DB_URL ? describe : describe.skip;

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
  const ownerUserId = await firstAuthUserId();
  if (!ownerUserId) {
    throw new Error("Expected bootstrap user id.");
  }
  const store = getWorkspaceStore();
  await store.addInstanceAdmin(ownerUserId);
  await store.ensurePersonalWorkspace(ownerUserId);
  const team = await store.createWorkspace({
    name: "Team",
    kind: "team",
    ownerUserId,
  });
  return { ownerUserId, team, store };
}

describeOrSkip("invite register", () => {
  beforeEach(async () => {
    process.env["BRAIN_DATABASE_URL"] = DB_URL;
    process.env["BETTER_AUTH_SECRET"] =
      process.env["BETTER_AUTH_SECRET"] ?? "test-only-better-auth-secret-32chars!!";
    resetBrainAuthForTests();
    await ensureAuthReady();
    await getPool().query(
      `TRUNCATE TABLE "session", "account", "verification", "user", brain_bootstrap_claim, brain_workspace_member, brain_workspace, brain_instance_admin, brain_user_active_workspace, brain_workspace_invite, brain_instance_policy RESTART IDENTITY CASCADE`,
    );
    await getPool().query(
      `INSERT INTO brain_instance_policy (id, signup_mode, auto_personal_workspace, allow_create_workspace, allow_forgot_password)
       VALUES (1, 'invite-only', true, true, true)
       ON CONFLICT (id) DO UPDATE SET signup_mode = 'invite-only', auto_personal_workspace = true, allow_create_workspace = true, allow_forgot_password = true`,
    );
  });

  afterEach(() => {
    resetBrainAuthForTests();
  });

  it("creates a user under invite-only and joins the workspace", async () => {
    expect((await getWorkspaceStore().getPolicies()).signupMode).toBe("invite-only");
    const { ownerUserId, team, store } = await bootstrapOwner();
    const invite = await store.createInvite({
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
      name: "Member",
      email: "member@example.com",
      password: "password12345",
    });
    expect(registered.email).toBe("member@example.com");
    expect(registered.name).toBe("Member");
    expect(registered.workspaceId).toBe(team.id);
    expect(await countAuthUsers()).toBe(2);
    expect(await store.getMembership(team.id, registered.id)).toBe("member");
  });

  it("rejects invalid invite tokens", async () => {
    await bootstrapOwner();
    await expect(
      registerWithInvite({
        token: "not-a-real-token",
        name: "Member",
        email: "member@example.com",
        password: "password12345",
      }),
    ).rejects.toThrow(/invalid|revoked/i);
  });
});
