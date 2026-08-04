import type { HandleMessageStreamEvent, SessionState } from "eve/client";
import { z } from "zod";
import type { ChatRecord, ChatSummary } from "@/lib/chat/store/types";
import { parseSessionState, parseStreamEvent, sessionStateSchema } from "@/lib/chat/store/parse";

const chatSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const chatRecordSchema = chatSummarySchema.extend({
  eveSession: sessionStateSchema.nullable(),
  events: z.array(z.unknown()),
});

function toChatRecord(value: unknown): ChatRecord {
  const parsed = chatRecordSchema.parse(value);
  return {
    id: parsed.id,
    title: parsed.title,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
    eveSession: parsed.eveSession === null ? null : parseSessionState(parsed.eveSession),
    events: parsed.events.map(parseStreamEvent),
  };
}

function toChatSummary(value: unknown): ChatSummary {
  return chatSummarySchema.parse(value);
}

async function readBody(response: Response): Promise<unknown> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed (${response.status})`);
  }
  if (response.status === 204) {
    return null;
  }
  const data: unknown = await response.json();
  return data;
}

export async function listChats(): Promise<readonly ChatSummary[]> {
  const response = await fetch("/api/chats", { cache: "no-store" });
  const data = await readBody(response);
  const parsed = z.object({ chats: z.array(z.unknown()) }).parse(data);
  return parsed.chats.map(toChatSummary);
}

export async function createChat(input?: {
  readonly id?: string;
  readonly title?: string;
}): Promise<ChatRecord> {
  const response = await fetch("/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input ?? {}),
  });
  const data = await readBody(response);
  const parsed = z.object({ chat: z.unknown() }).parse(data);
  return toChatRecord(parsed.chat);
}

export async function getChat(id: string): Promise<ChatRecord> {
  const response = await fetch(`/api/chats/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  const data = await readBody(response);
  const parsed = z.object({ chat: z.unknown() }).parse(data);
  return toChatRecord(parsed.chat);
}

export async function deleteChat(id: string): Promise<void> {
  const response = await fetch(`/api/chats/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await readBody(response);
}

export async function updateChat(
  id: string,
  input: {
    readonly title?: string;
    readonly eveSession?: SessionState | null;
    readonly appendEvents?: readonly HandleMessageStreamEvent[];
    readonly events?: readonly HandleMessageStreamEvent[];
  },
): Promise<ChatRecord> {
  const response = await fetch(`/api/chats/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readBody(response);
  const parsed = z.object({ chat: z.unknown() }).parse(data);
  return toChatRecord(parsed.chat);
}

export function chatUrl(chatId: string | null): string {
  return chatId ? `/?chat=${encodeURIComponent(chatId)}` : "/";
}

export function readChatIdFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return new URLSearchParams(window.location.search).get("chat");
}

export function replaceChatUrl(chatId: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  window.history.replaceState(null, "", chatUrl(chatId));
}
