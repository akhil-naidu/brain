export type WelcomePrompt = {
  readonly id: string;
  readonly label: string;
  readonly prompt: string;
};

/** Short starter prompts for the empty chat state. */
export const WELCOME_PROMPTS: readonly WelcomePrompt[] = [
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
  {
    id: "plan-day",
    label: "Plan my day",
    prompt: "Help me plan my day based on my tasks and messages.",
  },
];
