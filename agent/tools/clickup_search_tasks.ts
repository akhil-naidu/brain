import { defineTool } from "eve/tools";
import { z } from "zod";
import { clickupFetch } from "../lib/clickup";

export default defineTool({
  description:
    "Search ClickUp tasks in a workspace by free-text query (name/description).",
  inputSchema: z.object({
    workspaceId: z.string().min(1).describe("ClickUp workspace (team) id"),
    query: z.string().min(1).describe("Search text"),
    includeClosed: z
      .boolean()
      .optional()
      .describe("Include closed tasks. Defaults to false."),
  }),
  async execute({ workspaceId, query, includeClosed }) {
    const params = new URLSearchParams({
      search: query,
      include_closed: String(includeClosed ?? false),
    });
    const data = await clickupFetch<{
      tasks: Array<{
        id: string;
        name: string;
        status?: { status?: string };
        url?: string;
        list?: { id?: string; name?: string };
      }>;
    }>(`/team/${workspaceId}/task?${params.toString()}`);

    return {
      tasks: (data.tasks ?? []).slice(0, 25).map((task) => ({
        id: task.id,
        name: task.name,
        status: task.status?.status ?? null,
        url: task.url ?? null,
        listId: task.list?.id ?? null,
        listName: task.list?.name ?? null,
      })),
    };
  },
});
