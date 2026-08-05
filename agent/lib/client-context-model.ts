import type { ModelMessage } from "ai";
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

/** Reads the newest turn clientContext modelId from eve message history. */
export function extractSelectedModelIdFromMessages(messages: readonly ModelMessage[]): string {
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
    if (!context) {
      continue;
    }

    const modelId = context["modelId"];
    if (typeof modelId === "string") {
      return resolveBrainChatModelId(modelId);
    }
  }

  return resolveBrainChatModelId(undefined);
}
