import { z } from "zod";
import {
  MAX_PLAYBOOK_LABEL_CHARS,
  MAX_PLAYBOOK_PROMPT_CHARS,
  type Playbook,
} from "@/lib/chat/playbooks";

const playbookSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1).max(MAX_PLAYBOOK_LABEL_CHARS),
    prompt: z.string().min(1).max(MAX_PLAYBOOK_PROMPT_CHARS),
    updatedAt: z.number().finite(),
  })
  .strict();

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorMessage(data: unknown, fallback: string): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }
  return fallback;
}

function parsePlaybooks(data: unknown): readonly Playbook[] {
  if (typeof data !== "object" || data === null || !("playbooks" in data)) {
    return [];
  }
  const parsed = z.array(playbookSchema).safeParse(data.playbooks);
  return parsed.success ? parsed.data : [];
}

function parsePlaybook(data: unknown): Playbook {
  if (typeof data !== "object" || data === null || !("playbook" in data)) {
    throw new Error("Unable to save playbook.");
  }
  return playbookSchema.parse(data.playbook);
}

export async function listPlaybooksApi(): Promise<readonly Playbook[]> {
  const response = await fetch("/api/playbooks");
  const data: unknown = await parseJson(response);
  if (!response.ok) {
    throw new Error(errorMessage(data, "Unable to load playbooks."));
  }
  return parsePlaybooks(data);
}

export async function savePlaybookApi(input: {
  readonly id?: string;
  readonly label: string;
  readonly prompt: string;
}): Promise<Playbook> {
  const response = await fetch("/api/playbooks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const data: unknown = await parseJson(response);
  if (!response.ok) {
    throw new Error(errorMessage(data, "Unable to save playbook."));
  }
  return parsePlaybook(data);
}

export async function deletePlaybookApi(id: string): Promise<void> {
  const response = await fetch(`/api/playbooks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const data: unknown = await parseJson(response);
    throw new Error(errorMessage(data, "Unable to delete playbook."));
  }
}

export async function importPlaybooksApi(
  playbooks: readonly Playbook[],
): Promise<readonly Playbook[]> {
  const response = await fetch("/api/playbooks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ playbooks }),
  });
  const data: unknown = await parseJson(response);
  if (!response.ok) {
    throw new Error(errorMessage(data, "Unable to import playbooks."));
  }
  return parsePlaybooks(data);
}
