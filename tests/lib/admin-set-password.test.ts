import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { adminSetUserPassword } from "@/lib/auth/admin-set-password";
import {
  ensureAuthReady,
  getAuth,
  resetBrainAuthForTests,
  runWithBootstrapSignup,
} from "@/lib/auth/server";
import { getPool } from "@/lib/db/pool";

const DB_URL = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

const describeOrSkip = DB_URL ? describe : describe.skip;

async function countSessionsForUser(userId: string): Promise<number> {
  const result = await getPool().query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM session WHERE "userId" = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) return 0;
  return Number(row.count);
}

describeOrSkip("adminSetUserPassword", () => {
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

  it("updates password and clears sessions", async () => {
    await runWithBootstrapSignup(async () => {
      await getAuth().api.signUpEmail({
        body: {
          email: "ops@brain.local",
          password: "password12345",
          name: "ops",
        },
      });
    });

    const signIn = await getAuth().api.signInEmail({
      body: {
        email: "ops@brain.local",
        password: "password12345",
      },
    });
    const userId = signIn.user.id;
    expect(userId).toBeTruthy();

    expect(await countSessionsForUser(userId)).toBeGreaterThan(0);

    const result = await adminSetUserPassword(getAuth(), {
      userId,
      newPassword: "new-password-999",
    });
    expect(result).toEqual({ ok: true });

    expect(await countSessionsForUser(userId)).toBe(0);

    await expect(
      getAuth().api.signInEmail({
        body: {
          email: "ops@brain.local",
          password: "password12345",
        },
      }),
    ).rejects.toThrow();

    const next = await getAuth().api.signInEmail({
      body: {
        email: "ops@brain.local",
        password: "new-password-999",
      },
    });
    expect(next.user.id).toBe(userId);
  });

  it("rejects short passwords", async () => {
    const result = await adminSetUserPassword(getAuth(), {
      userId: "missing",
      newPassword: "short",
    });
    expect(result.ok).toBe(false);
  });
});
