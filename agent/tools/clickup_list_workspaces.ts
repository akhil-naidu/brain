import { defineTool } from "eve/tools";
import { z } from "zod";
import { clickupFetch } from "../lib/clickup";

export default defineTool({
  description:
    "List ClickUp workspaces (teams) available to the authenticated personal API token.",
  inputSchema: z.object({}),
  async execute() {
    const data = await clickupFetch<{
      teams: Array<{ id: string; name: string }>;
    }>("/team");
    return {
      workspaces: (data.teams ?? []).map((team) => ({
        id: team.id,
        name: team.name,
      })),
    };
  },
});
