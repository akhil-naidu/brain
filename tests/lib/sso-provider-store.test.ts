import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureAuthReady, resetBrainAuthForTests } from "@/lib/auth/server";
import { createSsoProviderStore } from "@/lib/auth/sso/provider-store";
import { getPool, resetPoolForTests } from "@/lib/db/pool";

const DATABASE_URL = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

if (!DATABASE_URL) {
  describe.skip("sso provider store (BRAIN_DATABASE_URL not set)", () => {
    it.skip("skipped", () => {});
  });
} else {
  describe("sso provider store", () => {
    beforeAll(async () => {
      resetBrainAuthForTests();
      await ensureAuthReady();
    });

    beforeEach(async () => {
      const pool = getPool();
      await pool.query(`DELETE FROM "ssoProvider"`);
      await pool.query(`DELETE FROM verification`);
      await pool.query(`DELETE FROM "user" WHERE id = $1`, ["user-sso-test-1"]);
      await pool.query(
        `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, TRUE, NOW(), NOW())`,
        ["user-sso-test-1", "SSO Test", "sso-test-1@example.com"],
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    afterAll(async () => {
      resetBrainAuthForTests();
      await resetPoolForTests();
    });

    it("stores providers per workspace and rejects domain conflicts", async () => {
      const workspaceIdA = "ws-sso-test-a";
      const workspaceIdB = "ws-sso-test-b";
      const userId = "user-sso-test-1";

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

      const store = createSsoProviderStore(getPool());
      await store.upsertOidc({
        providerId: "acme-oidc",
        issuer: "https://idp.example.com",
        domains: ["acme.com"],
        workspaceId: workspaceIdA,
        userId,
        clientId: "client",
        clientSecret: "secret",
      });

      await expect(
        store.upsertOidc({
          providerId: "other-oidc",
          issuer: "https://idp.example.com",
          domains: ["acme.com"],
          workspaceId: workspaceIdB,
          userId,
          clientId: "client2",
          clientSecret: "secret2",
        }),
      ).rejects.toThrow(/already used/i);

      const listed = await store.listByWorkspace(workspaceIdA);
      expect(listed).toHaveLength(1);
      expect(listed[0]?.domains).toEqual(["acme.com"]);
      expect(listed[0]?.organizationId).toBe(workspaceIdA);
      expect(listed[0]?.domainVerified).toBe(false);
    });
  });
}
