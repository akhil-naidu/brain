export type FeatureItem = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
};

export type FeatureSection = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly items: readonly FeatureItem[];
};

export const FEATURE_SECTIONS: readonly FeatureSection[] = [
  {
    id: "chat",
    title: "Chat that stays out of the way",
    summary:
      "A browser workspace for talking to Brain, streaming answers, and keeping local history.",
    items: [
      {
        id: "streaming-chat",
        title: "Streaming browser chat",
        summary: "Send messages and watch replies stream in — no agent terminal required.",
      },
      {
        id: "local-history",
        title: "Local chat history",
        summary:
          "Chats persist on your machine so you can reopen, rename, search, and continue later.",
      },
      {
        id: "welcome-prompts",
        title: "Welcome prompt chips",
        summary: "Empty-state starters for common work asks across your connected apps.",
      },
      {
        id: "edit-retry",
        title: "Edit and retry",
        summary: "Edit the last user message or retry a failed turn without starting over.",
      },
      {
        id: "copy",
        title: "Copy chat or message",
        summary: "Copy a full thread as Markdown, or copy a single bubble when you need a snippet.",
      },
    ],
  },
  {
    id: "connections",
    title: "Work apps, connected",
    summary:
      "Official MCP integrations with self-hosted OAuth — Connect from the menu, see status, and approve risky tools.",
    items: [
      {
        id: "clickup",
        title: "ClickUp",
        summary:
          "Search tasks, docs, and workspace structure via OAuth with dynamic client registration.",
      },
      {
        id: "slack",
        title: "Slack",
        summary: "Search and act in Slack with your own MCP app credentials.",
      },
      {
        id: "asana",
        title: "Asana",
        summary: "Work with Asana through the official MCP OAuth connection.",
      },
      {
        id: "gmail",
        title: "Gmail",
        summary: "Read and draft with Gmail MCP using your Google OAuth client.",
      },
      {
        id: "dflow",
        title: "dFlow",
        summary:
          "Inspect apps, environments, services, deployments, logs, and templates on dFlow Cloud.",
      },
      {
        id: "connect-status",
        title: "Connect, status, and Disconnect",
        summary:
          "See Connected / Sign in / Needs setup, start OAuth from the menu, or clear a local token with Disconnect.",
      },
    ],
  },
  {
    id: "models",
    title: "Pick the model for the turn",
    summary: "Switch among curated Command Code chat models without redeploying the agent.",
    items: [
      {
        id: "model-picker",
        title: "Composer model picker",
        summary: "Choose a stronger or faster model; Brain remembers your preference locally.",
      },
      {
        id: "per-turn",
        title: "Per-turn selection",
        summary: "Each send carries the selected model id so the agent can honor it for that turn.",
      },
    ],
  },
  {
    id: "keyboard",
    title: "Keyboard-first shell",
    summary: "Stay in flow with shortcuts for the sidebar, search, and new chats.",
    items: [
      {
        id: "new-chat",
        title: "New chat",
        summary: "⌘/Ctrl+Shift+O starts a fresh conversation.",
      },
      {
        id: "search",
        title: "Focus search",
        summary: "⌘/Ctrl+K or / jumps to chat search when you are not typing in an input.",
      },
      {
        id: "sidebar",
        title: "Toggle sidebar",
        summary: "⌘/Ctrl+B shows or hides the chat list.",
      },
    ],
  },
  {
    id: "runtime",
    title: "Self-hosted by design",
    summary: "Run Brain on your machine or server without Vercel platform lock-in.",
    items: [
      {
        id: "command-code",
        title: "Direct model provider",
        summary:
          "Models go through Command Code (or other direct providers) — not Vercel AI Gateway.",
      },
      {
        id: "oauth",
        title: "Self-hosted MCP OAuth",
        summary: "Interactive authorization and local token storage — no Vercel Connect required.",
      },
      {
        id: "hitl",
        title: "Human-in-the-loop",
        summary: "Connection sign-in and tool approvals surface in chat before risky actions run.",
      },
      {
        id: "local-trusted",
        title: "Local / trusted auth",
        summary:
          "No login wall for v1 — suited to a trusted machine, not a public multi-user deploy.",
      },
    ],
  },
];
