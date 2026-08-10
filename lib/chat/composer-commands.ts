import type { EnabledConnections } from "@/app/_components/chat-shell-context";
import { CONNECTION_ITEMS } from "@/lib/chat/connection-catalog";
import type { Playbook } from "@/lib/chat/playbooks";
import type { ScheduledPlaybook } from "@/lib/chat/scheduled-playbooks-api";
import type { ChatProject } from "@/lib/chat/store/types";

export type ComposerCommandAction =
  | { readonly type: "none" }
  | { readonly type: "enable-connection"; readonly connectionId: keyof EnabledConnections }
  | { readonly type: "run-playbook"; readonly prompt: string }
  | { readonly type: "new-chat-in-project"; readonly projectId: string }
  | { readonly type: "navigate"; readonly href: string };

export type ComposerCommandGroup = "Connections" | "Projects" | "Playbooks" | "Schedules";

export const COMPOSER_COMMAND_GROUPS: readonly ComposerCommandGroup[] = [
  "Connections",
  "Projects",
  "Playbooks",
  "Schedules",
];

export type ComposerCommandItem = {
  readonly id: string;
  readonly kind: "connection" | "project" | "playbook" | "schedule";
  readonly group: ComposerCommandGroup;
  readonly label: string;
  readonly description: string;
  readonly keywords: string;
  /** Plain-text tag included when the message is sent. */
  readonly mentionText: string;
  readonly action: ComposerCommandAction;
};

/** Selected mention rendered as an inline badge in the composer. */
export type ComposerMentionBadge = {
  readonly instanceId: string;
  readonly itemId: string;
  readonly kind: ComposerCommandItem["kind"];
  readonly label: string;
  readonly mentionText: string;
};

export function composeDraftWithMentions(
  text: string,
  mentions: readonly Pick<ComposerMentionBadge, "mentionText">[],
): string {
  const tags = mentions
    .map((mention) => mention.mentionText.trim())
    .filter((tag) => tag.length > 0)
    .join(" ");
  const body = text.trim();
  if (!tags) {
    return text;
  }
  if (!body) {
    return tags;
  }
  return `${tags} ${body}`;
}

export function buildComposerCommandItems(input: {
  readonly playbooks: readonly Playbook[];
  readonly projects: readonly ChatProject[];
  readonly schedules: readonly ScheduledPlaybook[];
  readonly enabledConnections: EnabledConnections;
}): readonly ComposerCommandItem[] {
  const connections: ComposerCommandItem[] = CONNECTION_ITEMS.map((item) => {
    const enabled = input.enabledConnections[item.key];
    return {
      id: `connection:${item.key}`,
      kind: "connection",
      group: "Connections",
      label: item.label,
      description: enabled ? "Enabled in this chat" : "Enable this MCP in chat",
      keywords: `${item.label} mcp connection integration ${item.key}`,
      mentionText: `@${item.label} `,
      action: { type: "enable-connection", connectionId: item.key },
    };
  });

  const projects: ComposerCommandItem[] = input.projects.map((project) => ({
    id: `project:${project.id}`,
    kind: "project",
    group: "Projects",
    label: project.name,
    description: "Open a new chat in this project",
    keywords: `${project.name} project folder`,
    mentionText: `@project ${project.name} `,
    action: { type: "new-chat-in-project", projectId: project.id },
  }));

  const playbooks: ComposerCommandItem[] = input.playbooks.map((playbook) => ({
    id: `playbook:${playbook.id}`,
    kind: "playbook",
    group: "Playbooks",
    label: playbook.label,
    description: "Run this playbook",
    keywords: `${playbook.label} playbook prompt`,
    mentionText: `@playbook ${playbook.label} `,
    action: { type: "run-playbook", prompt: playbook.prompt },
  }));

  const schedules: ComposerCommandItem[] = input.schedules.map((schedule) => ({
    id: `schedule:${schedule.id}`,
    kind: "schedule",
    group: "Schedules",
    label: schedule.label,
    description: schedule.enabled ? "Scheduled · open Schedules" : "Paused · open Schedules",
    keywords: `${schedule.label} schedule cron`,
    mentionText: `@schedule ${schedule.label} `,
    action: { type: "navigate", href: "/schedules" },
  }));

  return [...connections, ...projects, ...playbooks, ...schedules];
}

export function filterComposerCommandItems(
  items: readonly ComposerCommandItem[],
  query: string,
): readonly ComposerCommandItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return items;
  }
  return items.filter((item) => {
    const haystack = `${item.label} ${item.description} ${item.keywords}`.toLowerCase();
    return haystack.includes(needle);
  });
}
