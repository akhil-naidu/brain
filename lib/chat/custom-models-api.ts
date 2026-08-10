import { z } from "zod";

const catalogModelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string(),
  contextWindowTokens: z.number().int().positive(),
  source: z.enum(["command-code", "instance", "workspace"]),
});

const customModelSchema = z.object({
  id: z.string().min(1),
  scope: z.enum(["instance", "workspace"]),
  workspaceId: z.string().nullable(),
  label: z.string().min(1),
  description: z.string(),
  baseUrl: z.string().min(1),
  providerModelId: z.string().min(1),
  contextWindowTokens: z.number().int().positive(),
  hasApiKey: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const catalogResponseSchema = z.object({
  models: z.array(catalogModelSchema),
  workspaceId: z.string().min(1),
});

const manageResponseSchema = z.object({
  instanceModels: z.array(customModelSchema),
  workspaceModels: z.array(customModelSchema),
  capabilities: z.object({
    canManageInstance: z.boolean(),
    canManageWorkspace: z.boolean(),
  }),
  workspaceId: z.string().min(1),
});

export type CatalogModelDto = z.infer<typeof catalogModelSchema>;
export type CustomModelDto = z.infer<typeof customModelSchema>;

export type CustomModelWriteInput = {
  readonly label: string;
  readonly description?: string;
  readonly baseUrl: string;
  readonly providerModelId: string;
  readonly contextWindowTokens: number;
  readonly apiKey?: string | null;
};

async function readError(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
    ) {
      return data.error;
    }
  } catch {
    // ignore
  }
  return `Request failed (${response.status})`;
}

export async function fetchModelCatalog(): Promise<{
  readonly models: readonly CatalogModelDto[];
  readonly workspaceId: string;
}> {
  const response = await fetch("/api/models", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return catalogResponseSchema.parse(await response.json());
}

export async function fetchCustomModelsManage(): Promise<z.infer<typeof manageResponseSchema>> {
  const response = await fetch("/api/models/custom", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return manageResponseSchema.parse(await response.json());
}

export async function createCustomModel(
  scope: "instance" | "workspace",
  input: CustomModelWriteInput,
): Promise<CustomModelDto> {
  const response = await fetch("/api/models/custom", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scope, ...input }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const data: unknown = await response.json();
  const parsed = z.object({ model: customModelSchema }).parse(data);
  return parsed.model;
}

export async function updateCustomModel(
  id: string,
  input: Partial<CustomModelWriteInput>,
): Promise<CustomModelDto> {
  const response = await fetch(`/api/models/custom/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const data: unknown = await response.json();
  const parsed = z.object({ model: customModelSchema }).parse(data);
  return parsed.model;
}

export async function deleteCustomModel(id: string): Promise<void> {
  const response = await fetch(`/api/models/custom/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}
