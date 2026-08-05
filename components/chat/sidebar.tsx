"use client";

import {
  BookmarkIcon,
  CalendarClockIcon,
  ChevronDownIcon,
  MessageSquareIcon,
  PanelLeftIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { usePlaybooks } from "@/components/chat/use-playbooks";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { filterChatsByTitle } from "@/lib/chat/filter-chats";
import {
  focusChatSearchShortcutLabel,
  newChatShortcutLabel,
  toggleSidebarShortcutLabel,
} from "@/lib/chat/keyboard";
import { formatScheduleTimeValue } from "@/lib/chat/schedule-defaults";
import { fetchScheduledBrief } from "@/lib/chat/scheduled-brief-api";
import { listScheduledPlaybooks, type ScheduledPlaybook } from "@/lib/chat/scheduled-playbooks-api";
import { DEFAULT_CHAT_TITLE } from "@/lib/chat/title";
import type { ChatSummary } from "@/lib/chat/store/types";
import { cn } from "@/lib/utils";

const SIDEBAR_LIST_PREVIEW = 3;

export function ChatSidebar({
  brand,
  chats,
  className,
  activeChatId,
  compact = false,
  currentTitle,
  onDeleteChat,
  onNewChat,
  onRenameChat,
  onRunPlaybook,
  onSelectChat,
  onToggleSidebar,
  searchFocusRequest = 0,
  showChatDraft = false,
}: {
  readonly brand: ReactNode;
  readonly chats: readonly ChatSummary[];
  readonly className?: string;
  readonly activeChatId: string | null;
  readonly compact?: boolean;
  readonly currentTitle: string | null;
  readonly onDeleteChat: (chatId: string) => void;
  readonly onNewChat: () => void;
  readonly onRenameChat: (chatId: string, title: string) => void | Promise<void>;
  readonly onRunPlaybook?: (prompt: string) => void;
  readonly onSelectChat: (chatId: string) => void;
  readonly onToggleSidebar?: () => void;
  readonly searchFocusRequest?: number;
  /** When true, show the in-progress draft chat row if no chat is selected. */
  readonly showChatDraft?: boolean;
}) {
  const showDraftRow = showChatDraft && !activeChatId;
  const draftTitle = currentTitle?.trim() || DEFAULT_CHAT_TITLE;
  const shortcutLabel = newChatShortcutLabel();
  const searchShortcutLabel = focusChatSearchShortcutLabel();
  const sidebarShortcutLabel = toggleSidebarShortcutLabel();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editingIdRef = useRef<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filteredChats = filterChatsByTitle(chats, query);
  const hasActiveQuery = query.trim().length > 0;
  const { playbooks } = usePlaybooks();
  const [schedules, setSchedules] = useState<readonly ScheduledPlaybook[]>([]);
  const [morningBriefEnabled, setMorningBriefEnabled] = useState(false);
  const [playbooksOpen, setPlaybooksOpen] = useState(true);
  const [schedulesOpen, setSchedulesOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [listed, brief] = await Promise.all([
          listScheduledPlaybooks(),
          fetchScheduledBrief(),
        ]);
        if (cancelled) {
          return;
        }
        setSchedules(listed);
        setMorningBriefEnabled(brief.schedule.enabled);
      } catch {
        if (!cancelled) {
          setSchedules([]);
          setMorningBriefEnabled(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!editingId) {
      return;
    }
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [editingId]);

  useEffect(() => {
    if (searchFocusRequest <= 0) {
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [searchFocusRequest]);

  const beginRename = (chat: ChatSummary) => {
    editingIdRef.current = chat.id;
    setEditingId(chat.id);
    setEditValue(chat.title);
  };

  const cancelRename = () => {
    editingIdRef.current = null;
    setEditingId(null);
    setEditValue("");
  };

  const commitRename = (chatId: string) => {
    if (editingIdRef.current !== chatId) {
      return;
    }
    const next = editValue;
    cancelRename();
    void onRenameChat(chatId, next);
  };

  const previewPlaybooks = playbooks.slice(0, SIDEBAR_LIST_PREVIEW);
  const previewSchedules = schedules.slice(0, SIDEBAR_LIST_PREVIEW);

  if (compact) {
    return (
      <aside
        className={cn(
          "border-border bg-background flex h-full w-14 shrink-0 flex-col items-center border-r py-2",
          className,
        )}
      >
        <Link
          aria-label="Brain"
          className="text-foreground hover:bg-muted/50 mb-1 inline-flex size-9 items-center justify-center rounded-md"
          href="/chat"
          title="Brain"
        >
          {brand}
        </Link>
        {onToggleSidebar ? (
          <Button
            aria-label={`Expand sidebar (${sidebarShortcutLabel})`}
            className="text-muted-foreground/55 hover:text-muted-foreground mb-2"
            onClick={onToggleSidebar}
            size="icon-sm"
            title={`Expand sidebar (${sidebarShortcutLabel})`}
            type="button"
            variant="ghost"
          >
            <PanelLeftIcon className="size-4" />
          </Button>
        ) : null}
        <Button
          aria-label={`New chat (${shortcutLabel})`}
          className="text-muted-foreground"
          onClick={onNewChat}
          size="icon-sm"
          title={`New chat (${shortcutLabel})`}
          type="button"
          variant="ghost"
        >
          <PlusIcon className="size-4" />
        </Button>
        <Button
          aria-label="Chats"
          asChild
          className="text-muted-foreground mt-1"
          size="icon-sm"
          title="Chats"
          variant="ghost"
        >
          <Link href="/chat">
            <MessageSquareIcon className="size-4" />
          </Link>
        </Button>
        <Button
          aria-label="Playbooks"
          asChild
          className="text-muted-foreground mt-1"
          size="icon-sm"
          title="Playbooks"
          variant="ghost"
        >
          <Link href="/playbooks">
            <BookmarkIcon className="size-4" />
          </Link>
        </Button>
        <Button
          aria-label="Schedules"
          asChild
          className="text-muted-foreground mt-1"
          size="icon-sm"
          title="Schedules"
          variant="ghost"
        >
          <Link href="/schedules">
            <CalendarClockIcon className="size-4" />
          </Link>
        </Button>
        <div className="mt-auto pb-1">
          <Button
            aria-label="Home"
            asChild
            className="text-muted-foreground"
            size="icon-sm"
            title="Home"
            variant="ghost"
          >
            <Link href="/">
              <span className="text-[10px] font-medium">Home</span>
            </Link>
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "border-border bg-background flex h-full w-64 shrink-0 flex-col border-r",
        className,
      )}
    >
      <div className="flex flex-col gap-1 px-2 pt-2 pb-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="text-foreground flex min-w-0 items-center gap-2 text-sm font-medium">
            {brand}
          </div>
          {onToggleSidebar ? (
            <Button
              aria-label={`Collapse sidebar (${sidebarShortcutLabel})`}
              className="text-muted-foreground/55 hover:text-muted-foreground"
              onClick={onToggleSidebar}
              size="icon-sm"
              title={`Collapse sidebar (${sidebarShortcutLabel})`}
              type="button"
              variant="ghost"
            >
              <PanelLeftIcon className="size-4" />
            </Button>
          ) : null}
        </div>
        <button
          className="text-muted-foreground hover:bg-muted/50 hover:text-foreground flex h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-colors"
          onClick={onNewChat}
          title={`New chat (${shortcutLabel})`}
          type="button"
        >
          <PlusIcon className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 text-left">New chat</span>
          <span className="text-muted-foreground/55 shrink-0 text-[11px] tracking-wide">
            {shortcutLabel}
          </span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div className="relative mb-2 px-0.5">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            aria-label="Search chats"
            className="h-8 bg-transparent pr-12 pl-8 text-sm shadow-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats"
            ref={searchInputRef}
            title={`Search chats (${searchShortcutLabel})`}
            type="search"
            value={query}
          />
          <span className="text-muted-foreground/55 pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] tracking-wide">
            {searchShortcutLabel}
          </span>
        </div>
        <p className="text-muted-foreground/70 px-2 pb-1 text-[11px] font-medium tracking-wide uppercase">
          Chats
        </p>
        {showDraftRow ? (
          <div
            aria-current="page"
            className="bg-muted/50 text-foreground mb-1 rounded-md px-2 py-2 text-sm"
          >
            <span className="line-clamp-2">{draftTitle}</span>
          </div>
        ) : null}
        {chats.length === 0 && !showDraftRow && !hasActiveQuery ? (
          <p className="text-muted-foreground/70 px-2 py-2 text-sm">No chats yet</p>
        ) : null}
        {hasActiveQuery && filteredChats.length === 0 ? (
          <p className="text-muted-foreground/70 px-2 py-2 text-sm">No chats match</p>
        ) : null}
        <ul className="flex flex-col gap-0.5">
          {filteredChats.map((chat) => {
            const selected = chat.id === activeChatId;
            const editing = editingId === chat.id;
            return (
              <li key={chat.id}>
                <div
                  className={cn(
                    "group flex items-start gap-0.5 rounded-md",
                    selected ? "bg-muted/50" : "hover:bg-muted/40",
                  )}
                >
                  {editing ? (
                    <input
                      aria-label={`Rename ${chat.title}`}
                      className="border-border bg-background text-foreground focus-visible:ring-ring/50 mx-1 my-1 min-w-0 flex-1 rounded-md border px-2 py-1 text-sm outline-none focus-visible:ring-2"
                      onBlur={() => commitRename(chat.id)}
                      onChange={(event) => setEditValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitRename(chat.id);
                        } else if (event.key === "Escape") {
                          event.preventDefault();
                          cancelRename();
                        }
                      }}
                      ref={renameInputRef}
                      value={editValue}
                    />
                  ) : (
                    <button
                      aria-current={selected ? "page" : undefined}
                      className={cn(
                        "min-w-0 flex-1 cursor-pointer px-2 py-2 text-left text-sm",
                        selected
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => onSelectChat(chat.id)}
                      type="button"
                    >
                      <span className="line-clamp-2">{chat.title}</span>
                    </button>
                  )}
                  {!editing ? (
                    <>
                      <Button
                        aria-label={`Rename ${chat.title}`}
                        className="text-muted-foreground/50 hover:text-foreground mt-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => beginRename(chat)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <PencilIcon className="size-3.5" />
                      </Button>
                      <Button
                        aria-label={`Delete ${chat.title}`}
                        className="text-muted-foreground/50 hover:text-foreground mt-1 mr-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => onDeleteChat(chat.id)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        <Collapsible className="mt-4" onOpenChange={setPlaybooksOpen} open={playbooksOpen}>
          <div className="flex items-center gap-1 px-2 pb-1">
            <CollapsibleTrigger className="text-muted-foreground/70 hover:text-muted-foreground flex min-w-0 flex-1 cursor-pointer items-center justify-between text-[11px] font-medium tracking-wide uppercase">
              Playbooks
              <ChevronDownIcon
                className={cn(
                  "size-3.5 shrink-0 transition-transform",
                  playbooksOpen ? "rotate-0" : "-rotate-90",
                )}
              />
            </CollapsibleTrigger>
            <Link
              className="text-muted-foreground/70 hover:text-foreground shrink-0 text-[11px] font-medium tracking-wide transition-colors"
              href="/playbooks"
            >
              Manage
            </Link>
          </div>
          <CollapsibleContent>
            {previewPlaybooks.length === 0 ? (
              <p className="text-muted-foreground/70 px-2 py-1.5 text-sm">None yet</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {previewPlaybooks.map((item) => (
                  <li key={item.id}>
                    <button
                      className="text-muted-foreground hover:bg-muted/40 hover:text-foreground w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm"
                      onClick={() => onRunPlaybook?.(item.prompt)}
                      type="button"
                    >
                      <span className="line-clamp-1">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Collapsible className="mt-3" onOpenChange={setSchedulesOpen} open={schedulesOpen}>
          <div className="flex items-center gap-1 px-2 pb-1">
            <CollapsibleTrigger className="text-muted-foreground/70 hover:text-muted-foreground flex min-w-0 flex-1 cursor-pointer items-center justify-between text-[11px] font-medium tracking-wide uppercase">
              Schedules
              <ChevronDownIcon
                className={cn(
                  "size-3.5 shrink-0 transition-transform",
                  schedulesOpen ? "rotate-0" : "-rotate-90",
                )}
              />
            </CollapsibleTrigger>
            <Link
              className="text-muted-foreground/70 hover:text-foreground shrink-0 text-[11px] font-medium tracking-wide transition-colors"
              href="/schedules"
            >
              Manage
            </Link>
          </div>
          <CollapsibleContent>
            <ul className="flex flex-col gap-0.5">
              <li>
                <Link
                  className="text-muted-foreground hover:bg-muted/40 hover:text-foreground block rounded-md px-2 py-1.5 text-sm transition-colors"
                  href="/schedules"
                >
                  <span className="line-clamp-1">
                    Morning brief · {morningBriefEnabled ? "On" : "Off"}
                  </span>
                </Link>
              </li>
              {previewSchedules.map((schedule) => (
                <li key={schedule.id}>
                  <Link
                    className="text-muted-foreground hover:bg-muted/40 hover:text-foreground block rounded-md px-2 py-1.5 text-sm transition-colors"
                    href="/schedules"
                  >
                    <span className="line-clamp-1">
                      {schedule.label}
                      {" · "}
                      {formatScheduleTimeValue(schedule.hour, schedule.minute)}
                      {schedule.enabled ? "" : " · Off"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="border-border mt-auto border-t px-3 py-3">
        <Link
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          href="/"
        >
          Home
        </Link>
      </div>
    </aside>
  );
}
