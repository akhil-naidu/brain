import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertByoaAllowed,
  assertCanCreateUser,
  assertMultiWorkspaceAllowed,
  assertSignupModeAllowed,
  clearStoredLicenseKey,
  createLicenseKey,
  resolveLicenseEntitlements,
  UNLICENSED_ENTITLEMENTS,
  verifyLicenseKey,
  writeStoredLicenseKey,
} from "@/lib/auth/license";

const originalCwd = process.cwd();
const temporaryDirectories: string[] = [];
const secretEnv = {
  BRAIN_LICENSE_SECRET: "test-only-license-secret-32chars!!",
};

async function useTemporaryWorkingDirectory(): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), "brain-license-"));
  temporaryDirectories.push(directory);
  process.chdir(directory);
}

afterEach(async () => {
  process.chdir(originalCwd);
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("license keys", () => {
  it("signs and verifies a license payload", () => {
    const key = createLicenseKey(
      {
        maxUsers: 3,
        sso: false,
        multiWorkspace: true,
        byoa: false,
        openSignup: false,
        issuedAt: "2026-08-06T00:00:00.000Z",
        expiresAt: null,
      },
      secretEnv,
    );
    expect(key.startsWith("BRAIN1.")).toBe(true);
    expect(verifyLicenseKey(key, secretEnv)).toMatchObject({
      maxUsers: 3,
      sso: false,
      byoa: false,
      openSignup: false,
    });
  });

  it("rejects tampered signatures", () => {
    const key = createLicenseKey(
      {
        maxUsers: 3,
        sso: true,
        multiWorkspace: true,
        byoa: true,
        openSignup: true,
        issuedAt: "2026-08-06T00:00:00.000Z",
      },
      secretEnv,
    );
    const parts = key.split(".");
    parts[2] = "deadbeef";
    expect(() => verifyLicenseKey(parts.join("."), secretEnv)).toThrow(/signature/i);
  });

  it("resolves installed license entitlements from disk", async () => {
    await useTemporaryWorkingDirectory();
    expect(await resolveLicenseEntitlements(secretEnv)).toEqual(UNLICENSED_ENTITLEMENTS);

    const key = createLicenseKey(
      {
        maxUsers: 2,
        sso: false,
        multiWorkspace: false,
        byoa: false,
        openSignup: false,
        issuedAt: "2026-08-06T00:00:00.000Z",
      },
      secretEnv,
    );
    await writeStoredLicenseKey(key);
    await expect(resolveLicenseEntitlements(secretEnv)).resolves.toMatchObject({
      source: "license",
      maxUsers: 2,
      multiWorkspace: false,
    });
    await clearStoredLicenseKey();
    await expect(resolveLicenseEntitlements(secretEnv)).resolves.toEqual(UNLICENSED_ENTITLEMENTS);
  });
});

describe("license enforcement helpers", () => {
  const capped = {
    ...UNLICENSED_ENTITLEMENTS,
    source: "license" as const,
    maxUsers: 1,
    openSignup: false,
    sso: false,
    multiWorkspace: false,
    byoa: false,
  };

  it("blocks users at the cap", () => {
    expect(() => assertCanCreateUser(capped, 0)).not.toThrow();
    expect(() => assertCanCreateUser(capped, 1)).toThrow(/user limit/i);
  });

  it("blocks disallowed signup modes and features", () => {
    expect(() => assertSignupModeAllowed(capped, "open")).toThrow(/open signup/i);
    expect(() => assertSignupModeAllowed(capped, "sso-only")).toThrow(/sso/i);
    expect(() => assertMultiWorkspaceAllowed(capped)).toThrow(/workspaces/i);
    expect(() => assertByoaAllowed(capped)).toThrow(/byoa/i);
  });
});
