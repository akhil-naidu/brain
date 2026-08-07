export type HomeTourScene = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly points: readonly string[];
};

export type HomeCapability = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
};

/** Short product-tour beats for the home page — not a full feature inventory. */
export const HOME_TOUR_SCENES: readonly HomeTourScene[] = [
  {
    id: "chat",
    title: "Chat that stays on your host",
    summary:
      "A browser workspace for talking to Brain — streaming replies, saved threads, and starters when you need a nudge.",
    points: [
      "Replies stream in as Brain works",
      "History lives on this host — reopen, rename, search",
      "Edit the last message or retry a failed turn",
    ],
  },
  {
    id: "connections",
    title: "Connect the apps you already use",
    summary:
      "ClickUp, Slack, Asana, Gmail, dFlow, and GitHub — set up once, sign in from the menu, then turn tools on when you need them.",
    points: [
      "See Connected, Sign in, or Set up needed at a glance",
      "Connect, Disconnect, or App settings without leaving chat",
      "Browse loaded MCP tools after Connect",
    ],
  },
  {
    id: "models",
    title: "Pick the model for the moment",
    summary:
      "Switch among curated chat models from the composer. Brain remembers your choice on this device.",
    points: [
      "Faster or stronger — choose per turn",
      "Preference saved locally",
      "No redeploy to try another model",
    ],
  },
  {
    id: "runtime",
    title: "Self-hosted on purpose",
    summary:
      "Run Brain on your machine or server. Models and sign-in stay on paths you control — not locked to a single cloud platform.",
    points: [
      "Direct model provider — not a hosted gateway lock-in",
      "Better Auth sessions on your Postgres",
      "Built for a trusted local or team host",
    ],
  },
];

/** Extra product surface detail shown below the tour. */
export const HOME_CAPABILITIES: readonly HomeCapability[] = [
  {
    id: "workspaces",
    title: "Workspaces",
    body: "Personal and team spaces, invites, and an active workspace that scopes chats and MCP grants.",
  },
  {
    id: "tools",
    title: "Tools catalog",
    body: "After you connect an MCP app, browse the tools it loaded — no chat turn required.",
  },
  {
    id: "playbooks",
    title: "Playbooks & schedules",
    body: "Save reusable prompts and run morning briefs or scheduled playbooks on this host.",
  },
  {
    id: "governance",
    title: "Instance controls",
    body: "Signup mode, licenses, and operator settings for who can join and how the host behaves.",
  },
];
