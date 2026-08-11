import type { ModelMessage } from "ai";
import {
  DEFAULT_BRAIN_CHAT_MODE,
  resolveBrainChatMode,
  type BrainChatMode,
} from "@/lib/chat/chat-mode";
import { resolveBrainChatModelId } from "./models";

const CLIENT_CONTEXT_PREFIX = "Client context:\n";

function messageText(message: ModelMessage): string | null {
  if (typeof message.content === "string") {
    return message.content;
  }

  if (!Array.isArray(message.content)) {
    return null;
  }

  const texts: string[] = [];
  for (const part of message.content) {
    if (
      typeof part === "object" &&
      part !== null &&
      "type" in part &&
      part.type === "text" &&
      "text" in part &&
      typeof part.text === "string"
    ) {
      texts.push(part.text);
    }
  }

  return texts.length > 0 ? texts.join("\n") : null;
}

function parseClientContextObject(raw: string): Readonly<Record<string, unknown>> | null {
  if (!raw.startsWith(CLIENT_CONTEXT_PREFIX)) {
    return null;
  }

  const body = raw.slice(CLIENT_CONTEXT_PREFIX.length).trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    record[key] = value;
  }
  return record;
}

function newestClientContext(
  messages: readonly ModelMessage[],
): Readonly<Record<string, unknown>> | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== "user") {
      continue;
    }

    const text = messageText(message);
    if (!text) {
      continue;
    }

    const context = parseClientContextObject(text);
    if (context) {
      return context;
    }
  }
  return null;
}

/** Reads the newest turn clientContext modelId from eve message history. */
export function extractSelectedModelIdFromMessages(messages: readonly ModelMessage[]): string {
  const context = newestClientContext(messages);
  if (!context) {
    return resolveBrainChatModelId(undefined);
  }
  const modelId = context["modelId"];
  if (typeof modelId === "string") {
    return resolveBrainChatModelId(modelId);
  }
  return resolveBrainChatModelId(undefined);
}

/** Reads workspaceId from the newest turn client context when present. */
export function extractWorkspaceIdFromMessages(messages: readonly ModelMessage[]): string | null {
  const context = newestClientContext(messages);
  if (!context) {
    return null;
  }
  const workspaceId = context["workspaceId"];
  if (typeof workspaceId === "string" && workspaceId.trim()) {
    return workspaceId.trim();
  }
  return null;
}

/** Reads chat mode from the newest turn client context. */
export function extractChatModeFromMessages(messages: readonly ModelMessage[]): BrainChatMode {
  const context = newestClientContext(messages);
  if (!context) {
    return DEFAULT_BRAIN_CHAT_MODE;
  }
  const mode = context["mode"];
  return typeof mode === "string" ? resolveBrainChatMode(mode) : DEFAULT_BRAIN_CHAT_MODE;
}

/** True when the turn is Ask mode (plain chat, no tools). */
export function isAskModeTurn(messages: readonly ModelMessage[] | undefined): boolean {
  return extractChatModeFromMessages(messages ?? []) === "ask";
}

/** True when the turn is Plan mode (research/plan, no mutating harness tools). */
export function isPlanModeTurn(messages: readonly ModelMessage[] | undefined): boolean {
  return extractChatModeFromMessages(messages ?? []) === "plan";
}

/** True when the turn is Debug mode (evidence-first, full tools). */
export function isDebugModeTurn(messages: readonly ModelMessage[] | undefined): boolean {
  return extractChatModeFromMessages(messages ?? []) === "debug";
}

export type HarnessToolGate = "all" | "mutating";

/**
 * Whether a harness tool should be omitted for the current turn.
 * - Ask: omit every harness tool
 * - Plan: omit mutating tools only (write_file, bash)
 * - Agent / Debug: keep tools
 */
export function shouldOmitHarnessTool(
  messages: readonly ModelMessage[] | undefined,
  gate: HarnessToolGate = "all",
): boolean {
  const mode = extractChatModeFromMessages(messages ?? []);
  if (mode === "ask") {
    return true;
  }
  if (gate === "mutating" && mode === "plan") {
    return true;
  }
  return false;
}
