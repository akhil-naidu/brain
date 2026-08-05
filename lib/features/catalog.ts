export type HomeTourScene = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly points: readonly string[];
};

/** Short product-tour beats for the home page — not a full feature inventory. */
export const HOME_TOUR_SCENES: readonly HomeTourScene[] = [
  {
    id: "chat",
    title: "Chat that stays on your machine",
    summary:
      "A browser workspace for talking to Brain — streaming replies, local history, and starters when you need a nudge.",
    points: [
      "Replies stream in as Brain works",
      "History stays on this host — reopen, rename, search",
      "Edit the last message or retry a failed turn",
    ],
  },
  {
    id: "connections",
    title: "Connect the apps you already use",
    summary:
      "ClickUp, Slack, Asana, Gmail, and dFlow — set up once, sign in from the menu, then turn tools on when you need them.",
    points: [
      "See Connected, Sign in, or Set up needed at a glance",
      "Connect or Disconnect without leaving chat",
      "Approve risky actions before they run",
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
      "App sign-in stored on this host",
      "Built for a trusted local or team machine",
    ],
  },
];
