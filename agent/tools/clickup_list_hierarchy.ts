import { defineTool } from "eve/tools";
import { z } from "zod";
import { clickupFetch } from "../lib/clickup";

type Space = { id: string; name: string };
type Folder = { id: string; name: string; lists?: Array<{ id: string; name: string }> };
type List = { id: string; name: string };

export default defineTool({
  description:
    "List ClickUp spaces, folders, and lists for a workspace so you can find a list_id before creating a task.",
  inputSchema: z.object({
    workspaceId: z
      .string()
      .min(1)
      .describe("ClickUp workspace (team) id from clickup_list_workspaces"),
  }),
  async execute({ workspaceId }) {
    const spacesData = await clickupFetch<{ spaces: Space[] }>(
      `/team/${workspaceId}/space?archived=false`,
    );

    const spaces = [];
    for (const space of spacesData.spaces ?? []) {
      const foldersData = await clickupFetch<{ folders: Folder[] }>(
        `/space/${space.id}/folder?archived=false`,
      );
      const folderlessData = await clickupFetch<{ lists: List[] }>(
        `/space/${space.id}/list?archived=false`,
      );

      spaces.push({
        id: space.id,
        name: space.name,
        folders: (foldersData.folders ?? []).map((folder) => ({
          id: folder.id,
          name: folder.name,
          lists: (folder.lists ?? []).map((list) => ({
            id: list.id,
            name: list.name,
          })),
        })),
        folderlessLists: (folderlessData.lists ?? []).map((list) => ({
          id: list.id,
          name: list.name,
        })),
      });
    }

    return { workspaceId, spaces };
  },
});
