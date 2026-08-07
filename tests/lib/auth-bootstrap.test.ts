import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
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
      name: "Ops",
      email: "ops@brain.local",
      password: "password12345",
    });
    expect(user.email).toBe("ops@brain.local");
    expect(user.name).toBe("Ops");
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

  it("allows first-user signup when bootstrap claim is held without ALS", async () => {
    expect(claimFirstBootstrap()).toBe(true);
    await getAuth().api.signUpEmail({
      body: {
        email: "ops@brain.local",
        password: "password12345",
        name: "ops",
      },
    });
    expect(countAuthUsers()).toBe(1);

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
    expect(countAuthUsers()).toBe(1);
  });
});
