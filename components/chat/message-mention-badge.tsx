"use client";

import { BookmarkIcon, CalendarClockIcon, FolderIcon, PlugIcon } from "lucide-react";
import { connectionItemForLabel } from "@/lib/chat/connection-catalog";

type MentionKind = "connection" | "project" | "playbook" | "schedule";

function mentionKindFromToken(token: string): MentionKind {
  const trimmed = token.trim();
  if (trimmed.startsWith("@project ")) {
    return "project";
  }
  if (trimmed.startsWith("@playbook ")) {
    return "playbook";
  }
  if (trimmed.startsWith("@schedule ")) {
    return "schedule";
  }
  return "connection";
}

function mentionLabel(token: string): string {
  const trimmed = token.trim();
  if (trimmed.startsWith("@project ")) {
    return trimmed.slice("@project ".length);
  }
  if (trimmed.startsWith("@playbook ")) {
    return trimmed.slice("@playbook ".length);
  }
  if (trimmed.startsWith("@schedule ")) {
    return trimmed.slice("@schedule ".length);
  }
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

function MentionKindIcon({ kind, label }: { readonly kind: MentionKind; readonly label: string }) {
  const className = "size-3 shrink-0";
  if (kind === "project") {
    return <FolderIcon aria-hidden className={`${className} opacity-80`} />;
  }
  if (kind === "playbook") {
    return <BookmarkIcon aria-hidden className={`${className} opacity-80`} />;
  }
  if (kind === "schedule") {
    return <CalendarClockIcon aria-hidden className={`${className} opacity-80`} />;
  }
  const connection = connectionItemForLabel(label);
  if (connection) {
    const Icon = connection.Icon;
    return <Icon className={className} />;
  }
  return <PlugIcon aria-hidden className={`${className} opacity-80`} />;
}

export function MessageMentionBadge({
  token,
  className,
}: {
  readonly token: string;
  readonly className?: string;
}) {
  const label = mentionLabel(token);
  const classes = [
    "mx-0.5 inline-flex max-w-[14rem] items-center gap-1 rounded-md border px-1.5 py-0.5 align-baseline text-xs leading-5 font-medium",
    "border-teal-500/35 bg-teal-500/10 text-teal-700 dark:border-teal-400/40 dark:bg-teal-400/10 dark:text-teal-300",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      <MentionKindIcon kind={mentionKindFromToken(token)} label={label} />
      <span className="truncate">{label}</span>
    </span>
  );
}
