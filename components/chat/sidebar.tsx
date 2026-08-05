"use client";

import {
  ArrowUpRightIcon,
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

function SidebarSection({
  actions,
  children,
  className,
  contentClassName,
  onOpenChange,
  open,
  title,
}: {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly contentClassName?: string;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly title: string;
}) {
  return (
    <Collapsible
      className={cn("border-border/70 flex min-h-0 flex-col border-b", className)}
      onOpenChange={onOpenChange}
      open={open}
    >
      <div className="bg-muted/25 flex h-7 shrink-0 items-center gap-0.5 px-0.5">
        <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-sm px-1.5 py-1 text-left text-[11px] font-semibold tracking-wide uppercase">
          <ChevronDownIcon
            className={cn(
              "size-3.5 shrink-0 opacity-70 transition-transform",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
          <span className="truncate">{title}</span>
        </CollapsibleTrigger>
        {actions ? (
          <div className="flex shrink-0 items-center gap-0.5 pr-0.5">{actions}</div>
        ) : null}
      </div>
      <CollapsibleContent className={cn("min-h-0 data-[state=closed]:hidden", contentClassName)}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

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
  const [chatsOpen, setChatsOpen] = useState(true);
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
    setChatsOpen(true);
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
      <div className="border-border/70 flex shrink-0 items-center justify-between gap-2 border-b px-2 py-1.5">
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

      <div className="flex min-h-0 flex-1 flex-col">
        <SidebarSection
          actions={
            <Button
              aria-label={`New chat (${shortcutLabel})`}
              className="text-muted-foreground/70 hover:text-foreground size-6"
              onClick={onNewChat}
              size="icon-sm"
              title={`New chat (${shortcutLabel})`}
              type="button"
              variant="ghost"
            >
              <PlusIcon className="size-3.5" />
            </Button>
          }
          className={cn(chatsOpen && "min-h-0 flex-1")}
          contentClassName="flex min-h-0 flex-1 flex-col"
          onOpenChange={setChatsOpen}
          open={chatsOpen}
          title="Chats"
        >
          <div className="relative shrink-0 px-2 pt-2 pb-1.5">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2" />
            <Input
              aria-label="Search chats"
              className="border-border/60 bg-background/50 h-7 pr-11 pl-8 text-xs shadow-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              ref={searchInputRef}
              title={`Search chats (${searchShortcutLabel})`}
              type="search"
              value={query}
            />
            <span className="text-muted-foreground/50 pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[10px] tracking-wide">
              {searchShortcutLabel}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-1">
            {showDraftRow ? (
              <div
                aria-current="page"
                className="bg-muted/60 text-foreground mb-0.5 rounded-sm px-2 py-1.5 text-[13px]"
              >
                <span className="line-clamp-1">{draftTitle}</span>
              </div>
            ) : null}
            {chats.length === 0 && !showDraftRow && !hasActiveQuery ? (
              <p className="text-muted-foreground/70 px-2 py-2 text-xs">No chats yet</p>
            ) : null}
            {hasActiveQuery && filteredChats.length === 0 ? (
              <p className="text-muted-foreground/70 px-2 py-2 text-xs">No chats match</p>
            ) : null}
            <ul className="flex flex-col">
              {filteredChats.map((chat) => {
                const selected = chat.id === activeChatId;
                const editing = editingId === chat.id;
                return (
                  <li key={chat.id}>
                    <div
                      className={cn(
                        "group flex items-center gap-0.5 rounded-sm",
                        selected ? "bg-muted/70" : "hover:bg-muted/40",
                      )}
                    >
                      {editing ? (
                        <input
                          aria-label={`Rename ${chat.title}`}
                          className="border-border bg-background text-foreground focus-visible:ring-ring/50 mx-1 my-0.5 min-w-0 flex-1 rounded-sm border px-1.5 py-1 text-[13px] outline-none focus-visible:ring-2"
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
                            "min-w-0 flex-1 cursor-pointer px-2 py-1.5 text-left text-[13px]",
                            selected
                              ? "text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                          onClick={() => onSelectChat(chat.id)}
                          type="button"
                        >
                          <span className="line-clamp-1">{chat.title}</span>
                        </button>
                      )}
                      {!editing ? (
                        <>
                          <Button
                            aria-label={`Rename ${chat.title}`}
                            className="text-muted-foreground/50 hover:text-foreground size-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={() => beginRename(chat)}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <PencilIcon className="size-3" />
                          </Button>
                          <Button
                            aria-label={`Delete ${chat.title}`}
                            className="text-muted-foreground/50 hover:text-foreground mr-0.5 size-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={() => onDeleteChat(chat.id)}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2Icon className="size-3" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </SidebarSection>

        <SidebarSection
          actions={
            <Button
              aria-label="Open playbooks"
              asChild
              className="text-muted-foreground/70 hover:text-foreground size-6"
              size="icon-sm"
              title="Open playbooks"
              variant="ghost"
            >
              <Link href="/playbooks">
                <ArrowUpRightIcon className="size-3.5" />
              </Link>
            </Button>
          }
          className="shrink-0"
          contentClassName="max-h-36 overflow-y-auto"
          onOpenChange={setPlaybooksOpen}
          open={playbooksOpen}
          title="Playbooks"
        >
          {previewPlaybooks.length === 0 ? (
            <p className="text-muted-foreground/70 px-2.5 py-2 text-xs">None yet</p>
          ) : (
            <ul className="flex flex-col px-1 py-0.5">
              {previewPlaybooks.map((item) => (
                <li key={item.id}>
                  <button
                    className="text-muted-foreground hover:bg-muted/40 hover:text-foreground w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-[13px]"
                    onClick={() => onRunPlaybook?.(item.prompt)}
                    type="button"
                  >
                    <span className="line-clamp-1">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SidebarSection>

        <SidebarSection
          actions={
            <Button
              aria-label="Open schedules"
              asChild
              className="text-muted-foreground/70 hover:text-foreground size-6"
              size="icon-sm"
              title="Open schedules"
              variant="ghost"
            >
              <Link href="/schedules">
                <ArrowUpRightIcon className="size-3.5" />
              </Link>
            </Button>
          }
          className="shrink-0 border-b-0"
          contentClassName="max-h-40 overflow-y-auto"
          onOpenChange={setSchedulesOpen}
          open={schedulesOpen}
          title="Schedules"
        >
          <ul className="flex flex-col px-1 py-0.5">
            <li>
              <Link
                className="text-muted-foreground hover:bg-muted/40 hover:text-foreground block rounded-sm px-2 py-1.5 text-[13px] transition-colors"
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
                  className="text-muted-foreground hover:bg-muted/40 hover:text-foreground block rounded-sm px-2 py-1.5 text-[13px] transition-colors"
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
        </SidebarSection>
      </div>
    </aside>
  );
}
