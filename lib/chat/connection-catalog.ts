import type { ComponentType } from "react";
import {
  AsanaIcon,
  ClickUpIcon,
  DflowIcon,
  GitHubIcon,
  GmailIcon,
  SlackIcon,
} from "@/components/icons";
import type { EnabledConnections } from "@/app/_components/chat-shell-context";

export type ConnectionItem = {
  readonly key: keyof EnabledConnections;
  readonly label: string;
  readonly description: string;
  readonly Icon: ComponentType<{ readonly className?: string }>;
};

/** Static OAuth app credentials (not DCR). Set up / App settings apply here. */
export const STATIC_APP_CREDENTIAL_CONNECTION_IDS = [
  "slack",
  "asana",
  "gmail",
  "github",
] as const satisfies ReadonlyArray<keyof EnabledConnections>;

export function connectionNeedsStaticAppCredentials(connectionId: string): boolean {
  return (STATIC_APP_CREDENTIAL_CONNECTION_IDS as readonly string[]).includes(connectionId);
}

export const CONNECTION_ITEMS: readonly ConnectionItem[] = [
  {
    key: "clickup",
    label: "ClickUp",
    description: "Tasks, lists, and workspace search via ClickUp MCP.",
    Icon: ClickUpIcon,
  },
  {
    key: "slack",
    label: "Slack",
    description: "Channels, messages, and delivery for scheduled playbooks.",
    Icon: SlackIcon,
  },
  {
    key: "asana",
    label: "Asana",
    description: "Projects and tasks via the official Asana MCP.",
    Icon: AsanaIcon,
  },
  {
    key: "gmail",
    label: "Gmail",
    description: "Read and draft email with the Gmail MCP connection.",
    Icon: GmailIcon,
  },
  {
    key: "dflow",
    label: "dFlow",
    description: "Cloud MCP for dFlow workflows and deployments.",
    Icon: DflowIcon,
  },
  {
    key: "github",
    label: "GitHub",
    description: "Repos, issues, and pull requests via GitHub MCP.",
    Icon: GitHubIcon,
  },
];
