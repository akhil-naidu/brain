import { z } from "zod";

const toolSchema = z.object({
  name: z.string(),
  description: z.string(),
});

const connectionSchema = z.object({
  connectionId: z.string(),
  connectionName: z.string(),
  tools: z.array(toolSchema),
  error: z.string().nullable(),
});

const catalogSchema = z.object({
  connections: z.array(connectionSchema),
});

export type McpToolsCatalogResponse = z.infer<typeof catalogSchema>;

export async function fetchMcpToolsCatalog(): Promise<McpToolsCatalogResponse> {
  const response = await fetch("/api/connections/tools", { cache: "no-store" });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : `MCP tools catalog request failed (${response.status})`;
    throw new Error(error);
  }
  return catalogSchema.parse(data);
}
