import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isBootstrapAllowed } from "@/lib/auth/bootstrap";
import {
  ensureAuthReady,
  getAuth,
  getWorkspaceStore,
  resetBrainAuthForTests,
  runWithBootstrapSignup,
} from "@/lib/auth/server";

describe("signup status helpers", () => {
  let dir: string;
  let previousDbPath: string | undefined;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "brain-signup-status-"));
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

  it("keeps open signup off until policy is open and bootstrap is done", async () => {
    expect(isBootstrapAllowed()).toBe(true);
    expect(getWorkspaceStore().getPolicies().signupMode).toBe("invite-only");

    await runWithBootstrapSignup(async () => {
      await getAuth().api.signUpEmail({
        body: {
          email: "ops@brain.local",
          password: "password12345",
          name: "ops",
        },
      });
    });

    expect(isBootstrapAllowed()).toBe(false);
    expect(getWorkspaceStore().getPolicies().signupMode).toBe("invite-only");

    getWorkspaceStore().updatePolicies({ signupMode: "open" });
    expect(getWorkspaceStore().getPolicies().signupMode).toBe("open");
  });
});
