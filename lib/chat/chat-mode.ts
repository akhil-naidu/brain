export const BRAIN_CHAT_MODE_STORAGE_KEY = "brain.chatMode";

export const BRAIN_CHAT_MODES = ["ask", "agent"] as const;

export type BrainChatMode = (typeof BRAIN_CHAT_MODES)[number];

export const DEFAULT_BRAIN_CHAT_MODE: BrainChatMode = "agent";

export type BrainChatModeMeta = {
  readonly id: BrainChatMode;
  readonly label: string;
  readonly description: string;
};

export const BRAIN_CHAT_MODE_OPTIONS: readonly BrainChatModeMeta[] = [
  {
    id: "ask",
    label: "Ask",
    description: "Plain chat — no tools",
  },
  {
    id: "agent",
    label: "Agent",
    description: "Chat + tools when needed",
  },
];

export function isBrainChatMode(value: string | null | undefined): value is BrainChatMode {
  return value === "ask" || value === "agent";
}

export function resolveBrainChatMode(value: string | null | undefined): BrainChatMode {
  return isBrainChatMode(value) ? value : DEFAULT_BRAIN_CHAT_MODE;
}

export function getBrainChatModeMeta(mode: BrainChatMode): BrainChatModeMeta {
  for (const option of BRAIN_CHAT_MODE_OPTIONS) {
    if (option.id === mode) {
      return option;
    }
  }
  return {
    id: "agent",
    label: "Agent",
    description: "Chat + tools when needed",
  };
}

/** Cycle Ask ↔ Agent (Shift+Tab). */
export function cycleBrainChatMode(
  mode: BrainChatMode,
  direction: "next" | "previous" = "next",
): BrainChatMode {
  const current = resolveBrainChatMode(mode);
  const index = BRAIN_CHAT_MODES.indexOf(current);
  const offset = direction === "next" ? 1 : -1;
  const nextIndex = (index + offset + BRAIN_CHAT_MODES.length) % BRAIN_CHAT_MODES.length;
  return BRAIN_CHAT_MODES[nextIndex] ?? DEFAULT_BRAIN_CHAT_MODE;
}
