import { defineState } from "eve/context";
import type { ModelMessage } from "ai";
import { DEFAULT_BRAIN_CHAT_MODE, type BrainChatMode } from "@/lib/chat/chat-mode";
import { extractChatModeFromMessages } from "@/agent/lib/client-context-model";

/** Durable per-session slot so connection approval can read the active chat mode. */
export const turnChatMode = defineState(
  "brain.turnChatMode",
  (): BrainChatMode => DEFAULT_BRAIN_CHAT_MODE,
);

export function syncTurnChatMode(messages: readonly ModelMessage[]): void {
  turnChatMode.update(() => extractChatModeFromMessages(messages));
}
