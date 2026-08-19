import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createWorkspaceStore } from "@/lib/auth/workspaces/store";
import { DEFAULT_BRAIN_CHAT_MODEL_ID } from "@/agent/lib/models";
import {
  BuiltinModelValidationError,
  createBuiltinModelStore,
  resetBuiltinModelStoreForTests,
} from "@/lib/chat/builtin-models/store";
import { getPool, resetPoolForTests } from "@/lib/db/pool";
import { ensureBrainSchema } from "@/lib/db/schema";

const url = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

if (!url) {
  describe("builtin model store (Postgres)", () => {
    it.skip("BRAIN_DATABASE_URL not set — skipping builtin model store tests", () => {});
  });
} else {
  describe("builtin model store", () => {
    const pool = getPool();
    let postgresReady = true;

    beforeAll(async () => {
      try {
        await pool.query("SELECT 1");
      } catch {
        postgresReady = false;
      }
    });

    beforeEach(async (context) => {
      if (!postgresReady) {
        context.skip();
        return;
      }
      resetBuiltinModelStoreForTests();
      await ensureBrainSchema(pool);
      await pool.query(`
        TRUNCATE brain_workspace_disabled_builtin_model,
                 brain_workspace_invite,
                 brain_user_active_workspace,
                 brain_workspace_member,
                 brain_instance_admin,
                 brain_workspace
        RESTART IDENTITY CASCADE
      `);
    });

    afterAll(async () => {
      resetBuiltinModelStoreForTests();
      if (postgresReady) {
        await resetPoolForTests();
      }
    });

    it("defaults to all enabled and persists workspace disables", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personal = await workspaces.ensurePersonalWorkspace("user-1");
      const other = await workspaces.ensurePersonalWorkspace("user-2");
      const store = createBuiltinModelStore(pool);

      expect(await store.listDisabledModelIds(personal.id)).toEqual([]);

      await store.setEnabled(personal.id, DEFAULT_BRAIN_CHAT_MODEL_ID, false);
      expect(await store.listDisabledModelIds(personal.id)).toEqual([DEFAULT_BRAIN_CHAT_MODEL_ID]);
      expect(await store.listDisabledModelIds(other.id)).toEqual([]);

      await store.setEnabled(personal.id, DEFAULT_BRAIN_CHAT_MODEL_ID, true);
      expect(await store.listDisabledModelIds(personal.id)).toEqual([]);
    });

    it("enables and disables every built-in at once", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personal = await workspaces.ensurePersonalWorkspace("user-1");
      const store = createBuiltinModelStore(pool);

      await store.setAllEnabled(personal.id, false);
      const disabled = await store.listDisabledModelIds(personal.id);
      expect(disabled.length).toBeGreaterThanOrEqual(6);
      expect(disabled).toContain(DEFAULT_BRAIN_CHAT_MODEL_ID);

      await store.setAllEnabled(personal.id, true);
      expect(await store.listDisabledModelIds(personal.id)).toEqual([]);
    });

    it("rejects unknown model ids", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personal = await workspaces.ensurePersonalWorkspace("user-1");
      const store = createBuiltinModelStore(pool);

      await expect(store.setEnabled(personal.id, "not-a-model", false)).rejects.toBeInstanceOf(
        BuiltinModelValidationError,
      );
    });
  });
}
