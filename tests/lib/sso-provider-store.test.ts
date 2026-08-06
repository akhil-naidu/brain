import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureAuthReady,
  getAuth,
  getAuthDb,
  getWorkspaceStore,
  resetBrainAuthForTests,
  runWithBootstrapSignup,
} from "@/lib/auth/server";
import { createSsoProviderStore } from "@/lib/auth/sso/provider-store";

describe("sso provider store", () => {
  let dir: string;
  let previousDbPath: string | undefined;
  let userId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "brain-sso-"));
    previousDbPath = process.env["BRAIN_AUTH_DB_PATH"];
    process.env["BRAIN_AUTH_DB_PATH"] = path.join(dir, "auth.sqlite");
    process.env["BETTER_AUTH_SECRET"] =
      process.env["BETTER_AUTH_SECRET"] ?? "test-only-better-auth-secret-32chars!!";
    resetBrainAuthForTests();
    await ensureAuthReady();

    await runWithBootstrapSignup(async () => {
      await getAuth().api.signUpEmail({
        body: {
          email: "ops@brain.local",
          password: "password12345",
          name: "ops",
        },
      });
    });
    const row = getAuthDb().prepare("SELECT id FROM user LIMIT 1").get();
    if (typeof row !== "object" || row === null || !("id" in row) || typeof row.id !== "string") {
      throw new Error("Expected bootstrap user id.");
    }
    userId = row.id;
  });

  afterEach(() => {
    resetBrainAuthForTests();
    vi.unstubAllGlobals();
    if (previousDbPath === undefined) {
      delete process.env["BRAIN_AUTH_DB_PATH"];
    } else {
      process.env["BRAIN_AUTH_DB_PATH"] = previousDbPath;
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it("stores providers per workspace and rejects domain conflicts", async () => {
    const workspaces = getWorkspaceStore();
    const teamA = workspaces.createWorkspace({
      name: "Acme",
      kind: "team",
      ownerUserId: userId,
    });
    const teamB = workspaces.createWorkspace({
      name: "Other",
      kind: "team",
      ownerUserId: userId,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          issuer: "https://idp.example.com",
          authorization_endpoint: "https://idp.example.com/auth",
          token_endpoint: "https://idp.example.com/token",
          userinfo_endpoint: "https://idp.example.com/userinfo",
          jwks_uri: "https://idp.example.com/jwks",
        }),
      ),
    );

    const store = createSsoProviderStore(getAuthDb());
    await store.upsertOidc({
      providerId: "acme-oidc",
      issuer: "https://idp.example.com",
      domains: ["acme.com"],
      workspaceId: teamA.id,
      userId,
      clientId: "client",
      clientSecret: "secret",
    });

    await expect(
      store.upsertOidc({
        providerId: "other-oidc",
        issuer: "https://idp.example.com",
        domains: ["acme.com"],
        workspaceId: teamB.id,
        userId,
        clientId: "client2",
        clientSecret: "secret2",
      }),
    ).rejects.toThrow(/already used/i);

    const listed = store.listByWorkspace(teamA.id);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.domains).toEqual(["acme.com"]);
    expect(listed[0]?.organizationId).toBe(teamA.id);
    expect(workspaces.getMembership(teamA.id, userId)).toBe("owner");
  });
});
