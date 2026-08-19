import type { Pool } from "pg";
import { BRAIN_CHAT_MODELS, isBrainChatModelId } from "@/agent/lib/models";
import { getPool } from "@/lib/db/pool";
import { ensureBrainSchema } from "@/lib/db/schema";

export class BuiltinModelValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuiltinModelValidationError";
  }
}

export type BuiltinModelStore = {
  listDisabledModelIds(workspaceId: string): Promise<readonly string[]>;
  setEnabled(workspaceId: string, modelId: string, enabled: boolean): Promise<void>;
  setAllEnabled(workspaceId: string, enabled: boolean): Promise<void>;
};

export function createBuiltinModelStore(pool: Pool = getPool()): BuiltinModelStore {
  async function ready(): Promise<void> {
    await ensureBrainSchema(pool);
  }

  return {
    async listDisabledModelIds(workspaceId) {
      await ready();
      const result = await pool.query<{ model_id: string }>(
        `SELECT model_id FROM brain_workspace_disabled_builtin_model
         WHERE workspace_id = $1
         ORDER BY model_id ASC`,
        [workspaceId],
      );
      return result.rows
        .map((row) => row.model_id)
        .filter((modelId) => isBrainChatModelId(modelId));
    },

    async setEnabled(workspaceId, modelId, enabled) {
      await ready();
      if (!workspaceId.trim()) {
        throw new BuiltinModelValidationError("Workspace id is required.");
      }
      if (!isBrainChatModelId(modelId)) {
        throw new BuiltinModelValidationError("Unknown built-in model id.");
      }
      if (enabled) {
        await pool.query(
          `DELETE FROM brain_workspace_disabled_builtin_model
           WHERE workspace_id = $1 AND model_id = $2`,
          [workspaceId, modelId],
        );
        return;
      }
      await pool.query(
        `INSERT INTO brain_workspace_disabled_builtin_model (workspace_id, model_id, updated_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (workspace_id, model_id) DO UPDATE SET updated_at = EXCLUDED.updated_at`,
        [workspaceId, modelId, new Date().toISOString()],
      );
    },

    async setAllEnabled(workspaceId, enabled) {
      await ready();
      if (!workspaceId.trim()) {
        throw new BuiltinModelValidationError("Workspace id is required.");
      }
      if (enabled) {
        await pool.query(
          `DELETE FROM brain_workspace_disabled_builtin_model WHERE workspace_id = $1`,
          [workspaceId],
        );
        return;
      }
      const updatedAt = new Date().toISOString();
      const values: unknown[] = [];
      const rows = BRAIN_CHAT_MODELS.map((model, index) => {
        const workspaceParam = index * 3 + 1;
        values.push(workspaceId, model.id, updatedAt);
        return `($${workspaceParam}, $${workspaceParam + 1}, $${workspaceParam + 2})`;
      });
      if (rows.length === 0) {
        return;
      }
      await pool.query(
        `INSERT INTO brain_workspace_disabled_builtin_model (workspace_id, model_id, updated_at)
         VALUES ${rows.join(", ")}
         ON CONFLICT (workspace_id, model_id) DO UPDATE SET updated_at = EXCLUDED.updated_at`,
        values,
      );
    },
  };
}

let singleton: BuiltinModelStore | null = null;

export function getBuiltinModelStore(
  env: Record<string, string | undefined> = process.env,
): BuiltinModelStore {
  if (!singleton) {
    singleton = createBuiltinModelStore(getPool(env));
  }
  return singleton;
}

/** Test helper. */
export function resetBuiltinModelStoreForTests(): void {
  singleton = null;
}
