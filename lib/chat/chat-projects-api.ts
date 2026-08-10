import { z } from "zod";
import type { ChatProject } from "@/lib/chat/store/types";

const chatProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
});

async function readBody(response: Response): Promise<unknown> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed (${response.status})`);
  }
  return response.json();
}

function toProject(value: unknown): ChatProject {
  return chatProjectSchema.parse(value);
}

export async function listChatProjects(): Promise<readonly ChatProject[]> {
  const response = await fetch("/api/chat-projects", { cache: "no-store" });
  const data = await readBody(response);
  const parsed = z.object({ projects: z.array(z.unknown()) }).parse(data);
  return parsed.projects.map(toProject);
}

export async function createChatProject(input: {
  readonly name: string;
  readonly id?: string;
}): Promise<ChatProject> {
  const response = await fetch("/api/chat-projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readBody(response);
  const parsed = z.object({ project: z.unknown() }).parse(data);
  return toProject(parsed.project);
}

export async function updateChatProject(
  id: string,
  input: { readonly name: string },
): Promise<ChatProject> {
  const response = await fetch(`/api/chat-projects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readBody(response);
  const parsed = z.object({ project: z.unknown() }).parse(data);
  return toProject(parsed.project);
}

export async function deleteChatProject(id: string): Promise<void> {
  const response = await fetch(`/api/chat-projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (response.status === 204) {
    return;
  }
  await readBody(response);
}
