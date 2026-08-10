"use client";

import {
  BookmarkIcon,
  CalendarClockIcon,
  FolderIcon,
  PlugIcon,
  type LucideIcon,
} from "lucide-react";
import {
  COMPOSER_COMMAND_GROUPS,
  filterComposerCommandItems,
  type ComposerCommandGroup,
  type ComposerCommandItem,
} from "@/lib/chat/composer-commands";
import { connectionItemForId } from "@/lib/chat/connection-catalog";
import type { ComposerTrigger } from "@/lib/chat/composer-trigger";
import { cn } from "@/lib/utils";

/** Fixed list viewport so empty / 1–2 items don't resize the menu. */
const MENU_LIST_HEIGHT_CLASS = "h-64";

function itemIcon(kind: ComposerCommandItem["kind"]): LucideIcon {
  if (kind === "project") {
    return FolderIcon;
  }
  if (kind === "playbook") {
    return BookmarkIcon;
  }
  if (kind === "schedule") {
    return CalendarClockIcon;
  }
  return PlugIcon;
}

function CommandItemIcon({ item }: { readonly item: ComposerCommandItem }) {
  if (item.kind === "connection" && item.action.type === "enable-connection") {
    const connection = connectionItemForId(item.action.connectionId);
    if (connection) {
      const Icon = connection.Icon;
      return <Icon className="size-4 shrink-0" />;
    }
  }
  const Icon = itemIcon(item.kind);
  return <Icon className="text-muted-foreground size-4 shrink-0 opacity-80" />;
}

export function visibleComposerCommandItems(
  items: readonly ComposerCommandItem[],
  query: string,
  group?: ComposerCommandGroup | null,
): readonly ComposerCommandItem[] {
  const filtered = filterComposerCommandItems(items, query);
  const scoped = group ? filtered.filter((item) => item.group === group) : filtered;
  return COMPOSER_COMMAND_GROUPS.flatMap((name) => scoped.filter((item) => item.group === name));
}

function emptyStateMessage(group: ComposerCommandGroup, query: string): string {
  if (query.trim()) {
    return "No matches.";
  }
  if (group === "Projects") {
    return "No projects yet.";
  }
  if (group === "Playbooks") {
    return "No playbooks yet.";
  }
  if (group === "Schedules") {
    return "No schedules yet.";
  }
  return "No connections.";
}

export function ComposerCommandMenu({
  activeGroup,
  activeIndex,
  items,
  onHoverIndex,
  onSelect,
  onSelectGroup,
  trigger,
}: {
  readonly activeGroup: ComposerCommandGroup;
  readonly activeIndex: number;
  readonly items: readonly ComposerCommandItem[];
  readonly onHoverIndex: (index: number) => void;
  readonly onSelect: (item: ComposerCommandItem) => void;
  readonly onSelectGroup: (group: ComposerCommandGroup) => void;
  readonly trigger: ComposerTrigger;
}) {
  const visible = visibleComposerCommandItems(items, trigger.query, activeGroup);

  return (
    <div
      className="border-border bg-popover text-popover-foreground absolute inset-x-0 bottom-full z-50 mb-2 overflow-hidden rounded-xl border shadow-lg"
      data-composer-command-menu
      id="composer-command-menu"
    >
      <div
        aria-label="Mention categories"
        className="border-border/70 flex scrollbar-none gap-4 overflow-x-auto border-b px-3"
        role="tablist"
      >
        {COMPOSER_COMMAND_GROUPS.map((group) => {
          const selected = group === activeGroup;
          return (
            <button
              aria-selected={selected}
              className={cn(
                "relative shrink-0 cursor-pointer py-2.5 text-sm transition-colors",
                selected
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={group}
              onMouseDown={(event) => {
                event.preventDefault();
                onSelectGroup(group);
              }}
              role="tab"
              type="button"
            >
              {group}
              {selected ? (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-500"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className={cn(MENU_LIST_HEIGHT_CLASS, "overflow-y-auto py-1")}>
        {visible.length === 0 ? (
          <div className="flex h-full items-center justify-center px-3">
            <p className="text-muted-foreground text-center text-sm">
              {emptyStateMessage(activeGroup, trigger.query)}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col px-1">
            {visible.map((item, index) => {
              const active = index === activeIndex;
              return (
                <li key={item.id}>
                  <button
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted/60 text-foreground",
                    )}
                    id={`composer-command-option-${index}`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onSelect(item);
                    }}
                    onMouseEnter={() => {
                      onHoverIndex(index);
                    }}
                    type="button"
                  >
                    <CommandItemIcon item={item} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-border/70 text-muted-foreground border-t px-3 py-1.5 text-[10px]">
        {trigger.kind === "@" ? "@ mention" : "/ command"} · ↑↓ navigate · Enter select · Esc close
      </div>
    </div>
  );
}
