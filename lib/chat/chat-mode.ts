export const BRAIN_CHAT_MODE_STORAGE_KEY = "brain.chatMode";

export const BRAIN_CHAT_MODES = ["ask", "agent", "plan", "debug"] as const;

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
  {
    id: "plan",
    label: "Plan",
    description: "Research and plan — no edits",
  },
  {
    id: "debug",
    label: "Debug",
    description: "Evidence-first diagnosis and fixes",
  },
];

export function isBrainChatMode(value: string | null | undefined): value is BrainChatMode {
  return value === "ask" || value === "agent" || value === "plan" || value === "debug";
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
