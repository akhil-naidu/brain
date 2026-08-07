import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bootstrapFirstUser, isBootstrapAllowed, verifyBootstrapToken } from "@/lib/auth/bootstrap";
import {
  claimFirstBootstrap,
  countAuthUsers,
  ensureAuthReady,
  getAuth,
  resetBrainAuthForTests,
  runWithBootstrapSignup,
} from "@/lib/auth/server";
import { getPool } from "@/lib/db/pool";

const DB_URL = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

const describeOrSkip = DB_URL ? describe : describe.skip;

describeOrSkip("better auth bootstrap", () => {
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

  it("allows bootstrap only when no users exist", async () => {
    expect(await isBootstrapAllowed()).toBe(true);
    const user = await bootstrapFirstUser({
      name: "Ops",
      email: "ops@brain.local",
      password: "password12345",
    });
    expect(user.email).toBe("ops@brain.local");
    expect(user.name).toBe("Ops");
    expect(await countAuthUsers()).toBe(1);
    expect(await isBootstrapAllowed()).toBe(false);
  });

  it("blocks public signup outside the bootstrap gate", async () => {
    await expect(
      getAuth().api.signUpEmail({
        body: {
          email: "stranger@example.com",
          password: "password12345",
          name: "stranger",
        },
      }),
    ).rejects.toThrow(/Signup is disabled/i);

    await runWithBootstrapSignup(async () => {
      await getAuth().api.signUpEmail({
        body: {
          email: "ops@brain.local",
          password: "password12345",
          name: "ops",
        },
      });
    });
    expect(await countAuthUsers()).toBe(1);
  });

  it("allows first-user signup when bootstrap claim is held without ALS", async () => {
    expect(await claimFirstBootstrap()).toBe(true);
    await getAuth().api.signUpEmail({
      body: {
        email: "ops@brain.local",
        password: "password12345",
        name: "ops",
      },
    });
    expect(await countAuthUsers()).toBe(1);

    await expect(
      getAuth().api.signUpEmail({
        body: {
          email: "stranger@example.com",
          password: "password12345",
          name: "stranger",
        },
      }),
    ).rejects.toThrow(/Signup is disabled/i);
  });

  it("requires bootstrap token in production when configured", () => {
    expect(
      verifyBootstrapToken("right", {
        BRAIN_BOOTSTRAP_TOKEN: "right",
        NODE_ENV: "production",
      }),
    ).toBe(true);
    expect(
      verifyBootstrapToken("wrong", {
        BRAIN_BOOTSTRAP_TOKEN: "right",
        NODE_ENV: "production",
      }),
    ).toBe(false);
    expect(
      verifyBootstrapToken(undefined, {
        NODE_ENV: "production",
      }),
    ).toBe(false);
  });

  it("serializes parallel bootstrap so only one first user is created", async () => {
    const results = await Promise.allSettled([
      bootstrapFirstUser({ name: "A", email: "a@brain.local", password: "password12345" }),
      bootstrapFirstUser({ name: "B", email: "b@brain.local", password: "password12345" }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(await countAuthUsers()).toBe(1);
  });
});
