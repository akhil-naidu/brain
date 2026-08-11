export const BRAIN_CHAT_MODE_STORAGE_KEY = "brain.chatMode";

export const BRAIN_CHAT_MODES = ["ask", "agent"] as const;

export type BrainChatMode = (typeof BRAIN_CHAT_MODES)[number];

export const DEFAULT_BRAIN_CHAT_MODE: BrainChatMode = "agent";

export function isBrainChatMode(value: string | null | undefined): value is BrainChatMode {
  return value === "ask" || value === "agent";
}

export function resolveBrainChatMode(value: string | null | undefined): BrainChatMode {
  return isBrainChatMode(value) ? value : DEFAULT_BRAIN_CHAT_MODE;
}
