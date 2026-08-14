import { SITE_LICENSE_HREF } from "@/lib/seo/site";

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

export type HomeConnectionApp = {
  readonly id: string;
  readonly label: string;
};

export type HomeArchitecturePlane = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
};

/** Shipped MCP apps shown on the home “Works with” row. */
export const HOME_CONNECTION_APPS = [
  { id: "clickup", label: "ClickUp" },
  { id: "slack", label: "Slack" },
  { id: "asana", label: "Asana" },
  { id: "gmail", label: "Gmail" },
  { id: "notion", label: "Notion" },
  { id: "linear", label: "Linear" },
  { id: "atlassian", label: "Atlassian" },
  { id: "zernio", label: "Zernio" },
  { id: "sentry", label: "Sentry" },
  { id: "dflow", label: "dFlow" },
  { id: "github", label: "GitHub" },
  { id: "snowflake", label: "Snowflake" },
  { id: "mongodb", label: "MongoDB" },
  { id: "toolbox", label: "MCP Toolbox" },
] as const satisfies readonly HomeConnectionApp[];

/** Three-plane story for the home architecture section. */
export const HOME_ARCHITECTURE_PLANES: readonly HomeArchitecturePlane[] = [
  {
    id: "data",
    title: "Your Postgres",
    body: "Accounts, transcripts, playbooks, and schedules stay on the host. Brain does not copy Slack, ClickUp, or warehouse tables into a search index.",
  },
  {
    id: "models",
    title: "Models you choose",
    body: "Command Code built-ins, or any OpenAI-compatible endpoint — including Azure AI Foundry. Brain does not train models; fine-tuning stays at the model host.",
  },
  {
    id: "tools",
    title: "Live MCP tools",
    body: "Tasks, mail, deploys, and SQL at request time. If a tool is disconnected, Brain cannot pretend it still has that data.",
  },
];

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
      "ClickUp, Slack, Asana, Gmail, Notion, Linear, Atlassian, Zernio, Sentry, dFlow, GitHub, Snowflake, MongoDB, and MCP Toolbox — set up once, sign in from the menu, then turn tools on when you need them.",
    points: [
      "See Connected, Connect, or Set up needed at a glance",
      "Connect, Disconnect, or App settings without leaving chat",
      "Browse loaded MCP tools after Connect",
    ],
  },
  {
    id: "models",
    title: "Pick the model for the moment",
    summary:
      "Switch among curated chat models or custom OpenAI-compatible endpoints (including Azure AI Foundry). Brain remembers your choice on this device.",
    points: [
      "Faster or stronger — choose per turn",
      "Add Foundry, Ollama, or a company proxy on /models",
      "Preference saved locally",
    ],
  },
  {
    id: "runtime",
    title: "Self-hosted on purpose",
    summary:
      "Run Brain on your machine or on Dokku / dFlow Enterprise. Models and sign-in stay on paths you control — not a public AI website and not a hosted gateway lock-in.",
    points: [
      "Command Code or a custom OpenAI-compatible endpoint",
      "Better Auth sessions on your Postgres — no SQLite fallback",
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
    id: "approvals",
    title: "Approvals & Ask mode",
    body: "Mutating tools wait for in-chat approval. Switch to Ask and the assistant cannot reach Slack or Snowflake on that turn.",
  },
  {
    id: "governance",
    title: "Instance controls",
    body: "Signup mode, licenses, and operator settings for who can join and how the host behaves.",
  },
];

export type HomeFooterLink = {
  readonly href: string;
  readonly label: string;
  readonly external?: boolean;
};

export type HomeFooterGroup = {
  readonly id: string;
  readonly title: string;
  readonly links: readonly HomeFooterLink[];
};

/** Home footer columns — product, docs, and host. */
export const HOME_FOOTER_GROUPS: readonly HomeFooterGroup[] = [
  {
    id: "product",
    title: "Product",
    links: [
      { href: "#how", label: "How it works" },
      { href: "#architecture", label: "How it’s built" },
      { href: "/chat", label: "Open chat" },
    ],
  },
  {
    id: "docs",
    title: "Docs",
    links: [
      { href: "/docs", label: "Documentation" },
      { href: "/docs/self-hosting/architecture", label: "Architecture" },
      { href: "/docs/self-hosting", label: "Self-hosting" },
      { href: "/docs/models", label: "Models" },
      { href: "/docs/connections", label: "Connections" },
    ],
  },
  {
    id: "host",
    title: "This host",
    links: [
      {
        href: "https://github.com/akhil-naidu/brain",
        label: "GitHub",
        external: true,
      },
      {
        href: SITE_LICENSE_HREF,
        label: "MIT License",
        external: true,
      },
      { href: "/docs/self-hosting/security", label: "Security" },
      { href: "/sign-in", label: "Sign in" },
    ],
  },
];
