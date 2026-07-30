"use client";

import type { ComponentType } from "react";
import { HammerIcon } from "lucide-react";
import { AsanaIcon, ClickUpIcon, GmailIcon, SlackIcon } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EnabledConnections } from "@/app/_components/chat-shell-context";
import { cn } from "@/lib/utils";

type ConnectionItem = {
  readonly key: keyof EnabledConnections;
  readonly label: string;
  readonly Icon: ComponentType<{ readonly className?: string }>;
};

const CONNECTION_ITEMS: readonly ConnectionItem[] = [
  { key: "clickup", label: "ClickUp", Icon: ClickUpIcon },
  { key: "slack", label: "Slack", Icon: SlackIcon },
  { key: "asana", label: "Asana", Icon: AsanaIcon },
  { key: "gmail", label: "Gmail", Icon: GmailIcon },
];

export function IntegrationsMenu({
  enabledConnections,
  onConnectionEnabledChange,
}: {
  readonly enabledConnections: EnabledConnections;
  readonly onConnectionEnabledChange: (
    connection: keyof EnabledConnections,
    enabled: boolean,
  ) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Connections"
          className="text-muted-foreground/75 hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground dark:text-muted-foreground/60 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:outline-none [&_*]:cursor-pointer"
          type="button"
        >
          <HammerIcon className="size-4 shrink-0 cursor-pointer" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="border-border bg-popover w-48 rounded-md p-1"
        sideOffset={4}
      >
        {CONNECTION_ITEMS.map(({ Icon, key, label }) => {
          const enabled = enabledConnections[key];

          return (
            <DropdownMenuItem
              aria-checked={enabled}
              className="focus:bg-muted/70 h-9 cursor-pointer gap-2 rounded-sm px-2 py-1 text-sm"
              key={key}
              onSelect={(event) => {
                event.preventDefault();
                onConnectionEnabledChange(key, !enabled);
              }}
              role="menuitemcheckbox"
            >
              <span className="border-border bg-background flex size-7 shrink-0 items-center justify-center rounded-md border">
                <Icon className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-foreground block truncate text-sm">{label}</span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
                  enabled ? "bg-emerald-500" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "size-3 rounded-full bg-white shadow-sm transition-transform",
                    enabled ? "translate-x-[15px]" : "translate-x-0.5",
                  )}
                />
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
