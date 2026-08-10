import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { getPool } from "@/lib/db/pool";
import { ensureBrainSchema } from "@/lib/db/schema";
import { encryptCustomModelApiKey } from "@/lib/chat/custom-models/secret";
import type {
  CreateCustomModelInput,
  CustomModelRecord,
  CustomModelScope,
  CustomModelSecretRow,
  UpdateCustomModelInput,
} from "@/lib/chat/custom-models/types";
import {
  normalizeBaseUrl,
  normalizeContextWindowTokens,
  normalizeCustomModelDescription,
  normalizeCustomModelLabel,
  normalizeOptionalApiKey,
  normalizeProviderModelId,
} from "@/lib/chat/custom-models/validation";

type PgRow = {
  id: string;
  scope: string;
  workspace_id: string | null;
  label: string;
  description: string;
  base_url: string;
  provider_model_id: string;
  context_window_tokens: number;
  api_key_ciphertext: string | null;
  created_at: string;
  updated_at: string;
};

function parseScope(value: string): CustomModelScope {
  if (value === "instance" || value === "workspace") {
    return value;
  }
  throw new Error(`Invalid custom model scope: ${value}`);
}

function mapPublic(row: PgRow): CustomModelRecord {
  return {
    id: row.id,
    scope: parseScope(row.scope),
    workspaceId: row.workspace_id,
    label: row.label,
    description: row.description,
    baseUrl: row.base_url,
    providerModelId: row.provider_model_id,
    contextWindowTokens: row.context_window_tokens,
    hasApiKey: Boolean(row.api_key_ciphertext),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSecret(row: PgRow): CustomModelSecretRow {
  return {
    ...mapPublic(row),
    apiKeyCiphertext: row.api_key_ciphertext,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

export class CustomModelValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomModelValidationError";
  }
}

export type CustomModelStore = {
  listInstanceModels(): Promise<readonly CustomModelRecord[]>;
  listWorkspaceModels(workspaceId: string): Promise<readonly CustomModelRecord[]>;
  listVisibleModels(workspaceId: string): Promise<readonly CustomModelRecord[]>;
  getById(id: string): Promise<CustomModelRecord | null>;
  getSecretById(id: string): Promise<CustomModelSecretRow | null>;
  create(input: CreateCustomModelInput): Promise<CustomModelRecord>;
  update(id: string, input: UpdateCustomModelInput): Promise<CustomModelRecord | null>;
  delete(id: string): Promise<boolean>;
  countVisible(workspaceId: string): Promise<number>;
};

export function createCustomModelStore(
  pool: Pool = getPool(),
  env: Record<string, string | undefined> = process.env,
): CustomModelStore {
  async function ready(): Promise<void> {
    await ensureBrainSchema(pool);
  }

  return {
    async listInstanceModels() {
      await ready();
      const result = await pool.query<PgRow>(
        `SELECT * FROM brain_custom_model
         WHERE scope = 'instance'
         ORDER BY label ASC, created_at ASC`,
      );
      return result.rows.map(mapPublic);
    },

    async listWorkspaceModels(workspaceId) {
      await ready();
      const result = await pool.query<PgRow>(
        `SELECT * FROM brain_custom_model
         WHERE scope = 'workspace' AND workspace_id = $1
         ORDER BY label ASC, created_at ASC`,
        [workspaceId],
      );
      return result.rows.map(mapPublic);
    },

    async listVisibleModels(workspaceId) {
      await ready();
      const result = await pool.query<PgRow>(
        `SELECT * FROM brain_custom_model
         WHERE scope = 'instance'
            OR (scope = 'workspace' AND workspace_id = $1)
         ORDER BY scope ASC, label ASC, created_at ASC`,
        [workspaceId],
      );
      return result.rows.map(mapPublic);
    },

    async getById(id) {
      await ready();
      const result = await pool.query<PgRow>(`SELECT * FROM brain_custom_model WHERE id = $1`, [
        id,
      ]);
      const row = result.rows[0];
      return row ? mapPublic(row) : null;
    },

    async getSecretById(id) {
      await ready();
      const result = await pool.query<PgRow>(`SELECT * FROM brain_custom_model WHERE id = $1`, [
        id,
      ]);
      const row = result.rows[0];
      return row ? mapSecret(row) : null;
    },

    async create(input) {
      await ready();
      const label = normalizeCustomModelLabel(input.label);
      const description = normalizeCustomModelDescription(input.description);
      const baseUrl = normalizeBaseUrl(input.baseUrl);
      const providerModelId = normalizeProviderModelId(input.providerModelId);
      const contextWindowTokens = normalizeContextWindowTokens(input.contextWindowTokens);
      if (!label) {
        throw new CustomModelValidationError("Label is required.");
      }
      if (!baseUrl) {
        throw new CustomModelValidationError("A valid http(s) base URL is required.");
      }
      if (!providerModelId) {
        throw new CustomModelValidationError("Provider model id is required.");
      }
      if (contextWindowTokens == null) {
        throw new CustomModelValidationError("Context window tokens must be a positive integer.");
      }
      if (input.scope === "workspace" && !input.workspaceId?.trim()) {
        throw new CustomModelValidationError("Workspace id is required for workspace models.");
      }
      if (input.scope === "instance" && input.workspaceId) {
        throw new CustomModelValidationError("Instance models must not set a workspace id.");
      }

      const apiKey = normalizeOptionalApiKey(input.apiKey);
      const ciphertext = apiKey ? encryptCustomModelApiKey(apiKey, env) : null;
      const id = randomUUID();
      const createdAt = nowIso();
      const workspaceId = input.scope === "workspace" ? (input.workspaceId ?? null) : null;

      await pool.query(
        `INSERT INTO brain_custom_model (
           id, scope, workspace_id, label, description, base_url, provider_model_id,
           context_window_tokens, api_key_ciphertext, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          id,
          input.scope,
          workspaceId,
          label,
          description,
          baseUrl,
          providerModelId,
          contextWindowTokens,
          ciphertext,
          createdAt,
          createdAt,
        ],
      );

      const created = await this.getById(id);
      if (!created) {
        throw new Error("Failed to load created custom model.");
      }
      return created;
    },

    async update(id, input) {
      await ready();
      const existing = await this.getSecretById(id);
      if (!existing) {
        return null;
      }

      const label =
        input.label !== undefined ? normalizeCustomModelLabel(input.label) : existing.label;
      const description =
        input.description !== undefined
          ? normalizeCustomModelDescription(input.description)
          : existing.description;
      const baseUrl =
        input.baseUrl !== undefined ? normalizeBaseUrl(input.baseUrl) : existing.baseUrl;
      const providerModelId =
        input.providerModelId !== undefined
          ? normalizeProviderModelId(input.providerModelId)
          : existing.providerModelId;
      const contextWindowTokens =
        input.contextWindowTokens !== undefined
          ? normalizeContextWindowTokens(input.contextWindowTokens)
          : existing.contextWindowTokens;

      if (!label) {
        throw new CustomModelValidationError("Label is required.");
      }
      if (!baseUrl) {
        throw new CustomModelValidationError("A valid http(s) base URL is required.");
      }
      if (!providerModelId) {
        throw new CustomModelValidationError("Provider model id is required.");
      }
      if (contextWindowTokens == null) {
        throw new CustomModelValidationError("Context window tokens must be a positive integer.");
      }

      let ciphertext = existing.apiKeyCiphertext;
      // Blank / omitted key keeps the previous secret (admins re-paste to rotate).
      if (input.apiKey !== undefined) {
        const nextKey = normalizeOptionalApiKey(input.apiKey);
        if (nextKey) {
          ciphertext = encryptCustomModelApiKey(nextKey, env);
        }
      }

      await pool.query(
        `UPDATE brain_custom_model SET
           label = $2,
           description = $3,
           base_url = $4,
           provider_model_id = $5,
           context_window_tokens = $6,
           api_key_ciphertext = $7,
           updated_at = $8
         WHERE id = $1`,
        [
          id,
          label,
          description,
          baseUrl,
          providerModelId,
          contextWindowTokens,
          ciphertext,
          nowIso(),
        ],
      );

      return this.getById(id);
    },

    async delete(id) {
      await ready();
      const result = await pool.query(`DELETE FROM brain_custom_model WHERE id = $1`, [id]);
      return (result.rowCount ?? 0) > 0;
    },

    async countVisible(workspaceId) {
      await ready();
      const result = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM brain_custom_model
         WHERE scope = 'instance'
            OR (scope = 'workspace' AND workspace_id = $1)`,
        [workspaceId],
      );
      return Number(result.rows[0]?.count ?? 0);
    },
  };
}

let singleton: CustomModelStore | null = null;

export function getCustomModelStore(
  env: Record<string, string | undefined> = process.env,
): CustomModelStore {
  if (!singleton) {
    singleton = createCustomModelStore(getPool(env), env);
  }
  return singleton;
}

/** Test helper. */
export function resetCustomModelStoreForTests(): void {
  singleton = null;
}
