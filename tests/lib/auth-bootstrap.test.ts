import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bootstrapFirstUser, isBootstrapAllowed, verifyBootstrapToken } from "@/lib/auth/bootstrap";
import {
  countAuthUsers,
  ensureAuthReady,
  getAuth,
  resetBrainAuthForTests,
  runWithBootstrapSignup,
} from "@/lib/auth/server";

describe("better auth bootstrap", () => {
  let dir: string;
  let previousDbPath: string | undefined;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "brain-auth-"));
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

  it("allows bootstrap only when no users exist", async () => {
    expect(isBootstrapAllowed()).toBe(true);
    const user = await bootstrapFirstUser({
      email: "ops@brain.local",
      password: "password12345",
    });
    expect(user.email).toBe("ops@brain.local");
    expect(countAuthUsers()).toBe(1);
    expect(isBootstrapAllowed()).toBe(false);
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
    expect(countAuthUsers()).toBe(1);
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
});
