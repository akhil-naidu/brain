export type WelcomePrompt = {
  readonly id: string;
  readonly label: string;
  readonly prompt: string;
  /** When true, the empty-state UI may emphasize this starter. */
  readonly primary?: boolean;
};

export const MORNING_BRIEF_PROMPT_ID = "morning-brief";

export const MORNING_BRIEF_PROMPT = `Give me a short morning brief across my connected work apps.

Use only connections that are enabled and already signed in. If a connection is off or needs setup/sign-in, skip it and say so briefly — do not invent tasks, messages, or email.

Cover what you can with tools:
1. Tasks that need me today (ClickUp and/or Asana) — top priorities only
2. Important Slack threads or DMs I should see
3. Email that likely needs a reply (Gmail)
4. Any dFlow deploy or app health issues

Format as a tight brief with clear sections and concrete next actions. Ask before creating, updating, or sending anything.`;

/** Short starter prompts for the empty chat state. */
export const WELCOME_PROMPTS: readonly WelcomePrompt[] = [
  {
    id: MORNING_BRIEF_PROMPT_ID,
    label: "What's waiting on me?",
    prompt: MORNING_BRIEF_PROMPT,
    primary: true,
  },
  {
    id: "clickup-priorities",
    label: "Prioritize my ClickUp work",
    prompt: "Help me prioritize my open ClickUp tasks for today.",
  },
  {
    id: "slack-update",
    label: "Draft a Slack update",
    prompt: "Draft a short Slack update summarizing what I should focus on this week.",
  },
  {
    id: "gmail-triage",
    label: "Triage important email",
    prompt: "Help me triage important unread email and suggest what needs a reply first.",
  },
  {
    id: "dflow-status",
    label: "Check dFlow deploys",
    prompt: "List my dFlow applications and flag any recent failed deployments.",
  },
];
