import { z } from "zod";

export const BRAIN_PLAYBOOKS_STORAGE_KEY = "brain.playbooks.v1";
export const MAX_PLAYBOOKS = 12;
export const MAX_PLAYBOOK_LABEL_CHARS = 60;
export const MAX_PLAYBOOK_PROMPT_CHARS = 4_000;

const playbookSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1).max(MAX_PLAYBOOK_LABEL_CHARS),
    prompt: z.string().min(1).max(MAX_PLAYBOOK_PROMPT_CHARS),
    updatedAt: z.number().finite(),
  })
  .strict();

const playbooksSchema = z.array(playbookSchema).max(MAX_PLAYBOOKS);

export type Playbook = z.infer<typeof playbookSchema>;

export function normalizePlaybookLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_PLAYBOOK_LABEL_CHARS);
}

export function normalizePlaybookPrompt(value: string): string {
  return value.trim().slice(0, MAX_PLAYBOOK_PROMPT_CHARS);
}

export function createPlaybookId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `playbook-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function readStoredPlaybooks(
  storage: Pick<Storage, "getItem"> | null | undefined = typeof window === "undefined"
    ? null
    : window.localStorage,
): readonly Playbook[] {
  if (!storage) {
    return [];
  }
  try {
    const raw = storage.getItem(BRAIN_PLAYBOOKS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = playbooksSchema.safeParse(JSON.parse(raw) as unknown);
    if (!parsed.success) {
      return [];
    }
    return parsed.data.toSorted((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export const PLAYBOOKS_CHANGED_EVENT = "brain:playbooks-changed";

export function notifyPlaybooksChanged() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(PLAYBOOKS_CHANGED_EVENT));
}

export function writeStoredPlaybooks(
  playbooks: readonly Playbook[],
  storage: Pick<Storage, "setItem"> | null | undefined = typeof window === "undefined"
    ? null
    : window.localStorage,
): void {
  if (!storage) {
    return;
  }
  const normalized = playbooksSchema.parse(
    playbooks.map((item) => ({
      ...item,
      label: normalizePlaybookLabel(item.label),
      prompt: normalizePlaybookPrompt(item.prompt),
    })),
  );
  storage.setItem(BRAIN_PLAYBOOKS_STORAGE_KEY, JSON.stringify(normalized));
  notifyPlaybooksChanged();
}

export function upsertPlaybook(
  playbooks: readonly Playbook[],
  input: { readonly id?: string; readonly label: string; readonly prompt: string },
): { readonly playbooks: readonly Playbook[]; readonly playbook: Playbook } {
  const label = normalizePlaybookLabel(input.label);
  const prompt = normalizePlaybookPrompt(input.prompt);
  if (!label) {
    throw new Error("Name is required.");
  }
  if (!prompt) {
    throw new Error("Prompt is required.");
  }

  const now = Date.now();
  if (input.id) {
    const existing = playbooks.find((item) => item.id === input.id);
    if (!existing) {
      throw new Error("Playbook not found.");
    }
    const playbook: Playbook = { ...existing, label, prompt, updatedAt: now };
    return {
      playbook,
      playbooks: playbooks.map((item) => (item.id === input.id ? playbook : item)),
    };
  }

  if (playbooks.length >= MAX_PLAYBOOKS) {
    throw new Error(`You can save up to ${MAX_PLAYBOOKS} playbooks.`);
  }

  const playbook: Playbook = {
    id: createPlaybookId(),
    label,
    prompt,
    updatedAt: now,
  };
  return { playbook, playbooks: [playbook, ...playbooks] };
}

export function removePlaybook(playbooks: readonly Playbook[], id: string): readonly Playbook[] {
  return playbooks.filter((item) => item.id !== id);
}
