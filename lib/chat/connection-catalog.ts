import type { ComponentType } from "react";
import {
  AsanaIcon,
  AtlassianIcon,
  ClickUpIcon,
  DflowIcon,
  GitHubIcon,
  GmailIcon,
  LinearIcon,
  NotionIcon,
  SentryIcon,
  SlackIcon,
  SnowflakeIcon,
  ZernioIcon,
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

/** PAT connections (MCP URL + token). Set up / App settings; no OAuth Connect. */
export const PAT_CONNECTION_IDS = ["snowflake"] as const satisfies ReadonlyArray<
  keyof EnabledConnections
>;

export function connectionUsesPatAuth(connectionId: string): boolean {
  return (PAT_CONNECTION_IDS as readonly string[]).includes(connectionId);
}

/** @deprecated Use connectionUsesPatAuth */
export function connectionUsesPatEnvAuth(connectionId: string): boolean {
  return connectionUsesPatAuth(connectionId);
}

export function connectionNeedsStaticAppCredentials(connectionId: string): boolean {
  return (STATIC_APP_CREDENTIAL_CONNECTION_IDS as readonly string[]).includes(connectionId);
}

export function connectionOffersAppSetup(connectionId: string): boolean {
  return connectionNeedsStaticAppCredentials(connectionId) || connectionUsesPatAuth(connectionId);
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
    key: "notion",
    label: "Notion",
    description: "Pages, databases, and search via official Notion MCP.",
    Icon: NotionIcon,
  },
  {
    key: "linear",
    label: "Linear",
    description: "Issues, projects, and cycles via official Linear MCP.",
    Icon: LinearIcon,
  },
  {
    key: "atlassian",
    label: "Atlassian",
    description: "Jira, Confluence, and Compass via Atlassian Rovo MCP.",
    Icon: AtlassianIcon,
  },
  {
    key: "zernio",
    label: "Zernio",
    description: "Social posting, ads, and messaging via Zernio MCP.",
    Icon: ZernioIcon,
  },
  {
    key: "sentry",
    label: "Sentry",
    description: "Issues, traces, and Seer analysis via Sentry MCP.",
    Icon: SentryIcon,
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
  {
    key: "snowflake",
    label: "Snowflake",
    description: "Cortex, SQL, and warehouse tools via Snowflake MCP.",
    Icon: SnowflakeIcon,
  },
];

export function connectionItemForId(connectionId: string): ConnectionItem | undefined {
  const needle = connectionId.trim().toLowerCase();
  return CONNECTION_ITEMS.find((item) => item.key === needle);
}

export function connectionItemForLabel(label: string): ConnectionItem | undefined {
  const needle = label.trim().toLowerCase();
  return CONNECTION_ITEMS.find(
    (item) => item.label.toLowerCase() === needle || item.key === needle,
  );
}
