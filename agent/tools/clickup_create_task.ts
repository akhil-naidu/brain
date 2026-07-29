import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";
import { clickupFetch } from "../lib/clickup";

export default defineTool({
  description:
    "Create a ClickUp task in a list. Prefer resolving list_id via clickup_list_hierarchy first.",
  inputSchema: z.object({
    listId: z.string().min(1).describe("ClickUp list id to create the task in"),
    name: z.string().min(1).describe("Task title"),
    description: z
      .string()
      .optional()
      .describe("Optional task description (plain text or markdown)"),
    status: z.string().optional().describe("Optional status name for the list"),
    priority: z
      .number()
      .int()
      .min(1)
      .max(4)
      .optional()
      .describe("Optional priority: 1 urgent, 2 high, 3 normal, 4 low"),
    dueDateMs: z
      .number()
      .int()
      .optional()
      .describe("Optional due date as Unix epoch milliseconds"),
  }),
  // First create in a session asks for confirmation in the TUI.
  approval: once(),
  async execute({ listId, name, description, status, priority, dueDateMs }) {
    const task = await clickupFetch<{
      id: string;
      name: string;
      url: string;
      status?: { status?: string };
    }>(`/list/${listId}/task`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        status,
        priority,
        due_date: dueDateMs,
      }),
    });

    return {
      id: task.id,
      name: task.name,
      url: task.url,
      status: task.status?.status ?? null,
    };
  },
});
