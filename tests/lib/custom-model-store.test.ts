import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createWorkspaceStore } from "@/lib/auth/workspaces/store";
import {
  createCustomModelStore,
  resetCustomModelStoreForTests,
} from "@/lib/chat/custom-models/store";
import { getPool, resetPoolForTests } from "@/lib/db/pool";
import { ensureBrainSchema } from "@/lib/db/schema";

const url = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];
const env = {
  BETTER_AUTH_SECRET: "test-only-better-auth-secret-32chars!!",
  BRAIN_DATABASE_URL: url,
};

if (!url) {
  describe("custom model store (Postgres)", () => {
    it.skip("BRAIN_DATABASE_URL not set — skipping custom model store tests", () => {});
  });
} else {
  describe("custom model store", () => {
    const pool = getPool();

    beforeEach(async () => {
      resetCustomModelStoreForTests();
      await ensureBrainSchema(pool);
      await pool.query(`
        TRUNCATE brain_custom_model,
                 brain_workspace_invite,
                 brain_user_active_workspace,
                 brain_workspace_member,
                 brain_instance_admin,
                 brain_workspace
        RESTART IDENTITY CASCADE
      `);
    });

    afterAll(async () => {
      resetCustomModelStoreForTests();
      await resetPoolForTests();
    });

    it("stores instance and workspace models without leaking api keys", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personal = await workspaces.ensurePersonalWorkspace("user-1");
      const store = createCustomModelStore(pool, env);

      const instance = await store.create({
        scope: "instance",
        label: "Host Ollama",
        baseUrl: "http://127.0.0.1:11434/v1",
        providerModelId: "llama3.2",
        contextWindowTokens: 8192,
        apiKey: "secret-key",
      });
      expect(instance.hasApiKey).toBe(true);
      expect(JSON.stringify(instance)).not.toContain("secret-key");

      const workspace = await store.create({
        scope: "workspace",
        workspaceId: personal.id,
        label: "Team proxy",
        baseUrl: "https://proxy.example/v1",
        providerModelId: "gpt-test",
        contextWindowTokens: 128000,
      });

      const visible = await store.listVisibleModels(personal.id);
      expect(visible.map((row) => row.id).toSorted()).toEqual(
        [instance.id, workspace.id].toSorted(),
      );

      const updated = await store.update(instance.id, { label: "Host Ollama 2", apiKey: "" });
      expect(updated?.label).toBe("Host Ollama 2");
      expect(updated?.hasApiKey).toBe(true);

      const secret = await store.getSecretById(instance.id);
      expect(secret?.apiKeyCiphertext).toBeTruthy();
    });

    it("rejects invalid base URLs", async () => {
      const store = createCustomModelStore(pool, env);
      await expect(
        store.create({
          scope: "instance",
          label: "Bad",
          baseUrl: "ftp://example.com",
          providerModelId: "x",
          contextWindowTokens: 8192,
        }),
      ).rejects.toThrow(/base URL/i);
    });
  });
}
