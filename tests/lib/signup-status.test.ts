import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isBootstrapAllowed } from "@/lib/auth/bootstrap";
import {
  ensureAuthReady,
  getAuth,
  getWorkspaceStore,
  resetBrainAuthForTests,
  runWithBootstrapSignup,
} from "@/lib/auth/server";
import { getPool } from "@/lib/db/pool";

const DB_URL = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

const describeOrSkip = DB_URL ? describe : describe.skip;

describeOrSkip("signup status helpers", () => {
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

  it("keeps open signup off until policy is open and bootstrap is done", async () => {
    expect(await isBootstrapAllowed()).toBe(true);
    expect((await getWorkspaceStore().getPolicies()).signupMode).toBe("invite-only");

    await runWithBootstrapSignup(async () => {
      await getAuth().api.signUpEmail({
        body: {
          email: "ops@brain.local",
          password: "password12345",
          name: "ops",
        },
      });
    });

    expect(await isBootstrapAllowed()).toBe(false);
    expect((await getWorkspaceStore().getPolicies()).signupMode).toBe("invite-only");

    await getWorkspaceStore().updatePolicies({ signupMode: "open" });
    expect((await getWorkspaceStore().getPolicies()).signupMode).toBe("open");
  });
});
