import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { adminSetUserPassword } from "@/lib/auth/admin-set-password";
import {
  ensureAuthReady,
  getAuth,
  getAuthDb,
  resetBrainAuthForTests,
  runWithBootstrapSignup,
} from "@/lib/auth/server";

function countSessionsForUser(userId: string): number {
  const row = getAuthDb()
    .prepare("SELECT COUNT(*) AS count FROM session WHERE userId = ?")
    .get(userId);
  if (typeof row !== "object" || row === null || !("count" in row)) {
    return 0;
  }
  const value = row.count;
  return typeof value === "number" ? value : typeof value === "bigint" ? Number(value) : 0;
}

describe("adminSetUserPassword", () => {
  let dir: string;
  let previousDbPath: string | undefined;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "brain-admin-password-"));
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

    expect(countSessionsForUser(userId)).toBeGreaterThan(0);

    const result = await adminSetUserPassword(getAuth(), {
      userId,
      newPassword: "new-password-999",
    });
    expect(result).toEqual({ ok: true });

    expect(countSessionsForUser(userId)).toBe(0);

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
