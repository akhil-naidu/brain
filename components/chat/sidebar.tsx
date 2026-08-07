"use client";

import {
  BookmarkIcon,
  CalendarClockIcon,
  ChevronDownIcon,
  HammerIcon,
  MessageSquareIcon,
  PanelLeftIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { WorkspaceSwitcher } from "@/components/chat/workspace-switcher";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { IconTooltip } from "@/components/ui/tooltip";
import { filterChatsByTitle } from "@/lib/chat/filter-chats";
import {
  focusChatSearchShortcutLabel,
  newChatShortcutLabel,
  toggleSidebarShortcutLabel,
} from "@/lib/chat/keyboard";
import {
  DEFAULT_SIDEBAR_RECENT,
  clampSidebarRecentHeight,
  readSidebarRecent,
  writeSidebarRecent,
  type SidebarRecentState,
} from "@/lib/chat/sidebar-recent";
import { DEFAULT_CHAT_TITLE } from "@/lib/chat/title";
import type { ChatSummary } from "@/lib/chat/store/types";
import { cn } from "@/lib/utils";

function compactNavClass(active: boolean) {
  return cn(
    "mt-1",
    active
      ? "bg-muted text-foreground hover:bg-muted hover:text-foreground"
      : "text-muted-foreground",
  );
}

function SidebarNavLink({
  active,
  href,
  icon: Icon,
  label,
}: {
  readonly active: boolean;
  readonly href: string;
  readonly icon: typeof BookmarkIcon;
  readonly label: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md px-2 text-[13px] transition-colors",
        active
          ? "bg-muted text-foreground font-medium"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
      href={href}
    >
      <Icon className="size-3.5 shrink-0 opacity-80" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function ChatSidebar({
  brand,
  canCreateShared = false,
  chats,
  className,
  activeChatId,
  compact = false,
  currentTitle,
  draftVisibility = "personal",
  onDeleteChat,
  onNewChat,
  onNewSharedChat,
  onRenameChat,
  onShareChat,
  onSelectChat,
  onToggleSidebar,
  searchFocusRequest = 0,
  showChatDraft = false,
  viewerUserId = null,
}: {
  readonly brand: ReactNode;
  readonly canCreateShared?: boolean;
  readonly chats: readonly ChatSummary[];
  readonly className?: string;
  readonly activeChatId: string | null;
  readonly compact?: boolean;
  readonly currentTitle: string | null;
  readonly draftVisibility?: "personal" | "shared";
  readonly onDeleteChat: (chatId: string) => void;
  readonly onNewChat: () => void;
  readonly onNewSharedChat?: () => void;
  readonly onRenameChat: (chatId: string, title: string) => void | Promise<void>;
  readonly onShareChat?: (chatId: string) => void | Promise<void>;
  readonly onRunPlaybook?: (prompt: string) => void;
  readonly onSelectChat: (chatId: string) => void;
  readonly onToggleSidebar?: () => void;
  readonly searchFocusRequest?: number;
  /** When true, show the in-progress draft chat row if no chat is selected. */
  readonly showChatDraft?: boolean;
  readonly viewerUserId?: string | null;
}) {
  const pathname = usePathname();
  const chatsActive = pathname === "/chat";
  const playbooksActive = pathname === "/playbooks";
  const schedulesActive = pathname === "/schedules";
  const toolsActive = pathname === "/tools";
  const showDraftRow = showChatDraft && !activeChatId;
  const draftTitle =
    currentTitle?.trim() || (draftVisibility === "shared" ? "New shared chat" : DEFAULT_CHAT_TITLE);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [recent, setRecent] = useState<SidebarRecentState>(DEFAULT_SIDEBAR_RECENT);
  const [resizingRecent, setResizingRecent] = useState(false);
  const editingIdRef = useRef<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const recentPanelRef = useRef<HTMLDivElement>(null);
  const recentDragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const recentFillsHeight = recent.open && recent.heightPx === null;
  const filteredChats = filterChatsByTitle(chats, query);
  const hasActiveQuery = query.trim().length > 0;
  // Defer platform-specific labels to avoid SSR/client hydration mismatches.
  const shortcutLabel = mounted ? newChatShortcutLabel() : "";
  const searchShortcutLabel = mounted ? focusChatSearchShortcutLabel() : "";
  const sidebarShortcutLabel = mounted ? toggleSidebarShortcutLabel() : "";
  const newChatLabel = shortcutLabel ? `New chat (${shortcutLabel})` : "New chat";
  const collapseLabel = sidebarShortcutLabel
    ? `Collapse sidebar (${sidebarShortcutLabel})`
    : "Collapse sidebar";
  const expandLabel = sidebarShortcutLabel
    ? `Expand sidebar (${sidebarShortcutLabel})`
    : "Expand sidebar";
  const updateRecent = (patch: Partial<SidebarRecentState>) => {
    setRecent((previous) => {
      const next: SidebarRecentState = {
        open: patch.open ?? previous.open,
        heightPx:
          patch.heightPx === undefined
            ? previous.heightPx
            : patch.heightPx === null
              ? null
              : clampSidebarRecentHeight(patch.heightPx),
      };
      writeSidebarRecent(next);
      return next;
    });
  };

  const beginResizeRecent = (clientY: number) => {
    const measured = recentPanelRef.current?.getBoundingClientRect().height;
    const startHeight =
      recent.heightPx ??
      (typeof measured === "number" && measured > 0 ? measured : clampSidebarRecentHeight(320));
    recentDragRef.current = { startY: clientY, startHeight };
    setRecent((previous) => ({ ...previous, heightPx: clampSidebarRecentHeight(startHeight) }));
    setResizingRecent(true);
  };

  useEffect(() => {
    setMounted(true);
    setRecent(readSidebarRecent());
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
    setRecent((previous) => {
      if (previous.open) {
        return previous;
      }
      const next = { ...previous, open: true };
      writeSidebarRecent(next);
      return next;
    });
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [searchFocusRequest]);

  useEffect(() => {
    if (!resizingRecent) {
      return undefined;
    }
    const onMove = (event: PointerEvent) => {
      const drag = recentDragRef.current;
      if (!drag) {
        return;
      }
      // Dragging the handle upward increases the recent panel height.
      const nextHeight = clampSidebarRecentHeight(drag.startHeight + (drag.startY - event.clientY));
      setRecent((previous) => ({ ...previous, heightPx: nextHeight }));
    };
    const onUp = () => {
      recentDragRef.current = null;
      setResizingRecent(false);
      setRecent((previous) => {
        writeSidebarRecent(previous);
        return previous;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizingRecent]);

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

  if (compact) {
    return (
      <aside
        className={cn(
          "border-border bg-background flex h-full w-14 shrink-0 flex-col items-center border-r",
          className,
        )}
      >
        <div className="border-border/50 flex w-full shrink-0 flex-col items-center justify-center gap-1.5 border-b py-2">
          {brand}
          <WorkspaceSwitcher compact />
        </div>
        <div className="flex w-full flex-col items-center px-1 py-2">
          {onToggleSidebar ? (
            <IconTooltip label={expandLabel} side="right">
              <Button
                aria-label={expandLabel}
                className="text-muted-foreground/55 hover:text-muted-foreground"
                onClick={onToggleSidebar}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <PanelLeftIcon className="size-4" />
              </Button>
            </IconTooltip>
          ) : null}
          <IconTooltip label={newChatLabel} side="right">
            <Button
              aria-label={newChatLabel}
              className="text-muted-foreground mt-1"
              onClick={onNewChat}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <PlusIcon className="size-4" />
            </Button>
          </IconTooltip>
          {canCreateShared && onNewSharedChat ? (
            <IconTooltip label="New shared chat" side="right">
              <Button
                aria-label="New shared chat"
                className="text-muted-foreground mt-1"
                onClick={onNewSharedChat}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <UserPlusIcon className="size-4" />
              </Button>
            </IconTooltip>
          ) : null}
          <IconTooltip label="Chats" side="right">
            <Button
              aria-current={chatsActive ? "page" : undefined}
              aria-label="Chats"
              asChild
              className={compactNavClass(chatsActive)}
              size="icon-sm"
              variant="ghost"
            >
              <Link href="/chat">
                <MessageSquareIcon className="size-4" />
              </Link>
            </Button>
          </IconTooltip>
          <IconTooltip label="Playbooks" side="right">
            <Button
              aria-current={playbooksActive ? "page" : undefined}
              aria-label="Playbooks"
              asChild
              className={compactNavClass(playbooksActive)}
              size="icon-sm"
              variant="ghost"
            >
              <Link href="/playbooks">
                <BookmarkIcon className="size-4" />
              </Link>
            </Button>
          </IconTooltip>
          <IconTooltip label="Schedules" side="right">
            <Button
              aria-current={schedulesActive ? "page" : undefined}
              aria-label="Schedules"
              asChild
              className={compactNavClass(schedulesActive)}
              size="icon-sm"
              variant="ghost"
            >
              <Link href="/schedules">
                <CalendarClockIcon className="size-4" />
              </Link>
            </Button>
          </IconTooltip>
          <IconTooltip label="Tools" side="right">
            <Button
              aria-current={toolsActive ? "page" : undefined}
              aria-label="Tools"
              asChild
              className={compactNavClass(toolsActive)}
              size="icon-sm"
              variant="ghost"
            >
              <Link href="/tools">
                <HammerIcon className="size-4" />
              </Link>
            </Button>
          </IconTooltip>
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
      <div className="flex shrink-0 flex-col px-3 pt-3 pb-3">
        <div className="flex h-8 items-center justify-between gap-1">
          <div className="text-foreground min-w-0 flex-1 text-sm font-medium">{brand}</div>
          {onToggleSidebar ? (
            <IconTooltip label={collapseLabel} side="bottom">
              <Button
                aria-label={collapseLabel}
                className="text-muted-foreground/55 hover:text-muted-foreground size-7 shrink-0"
                onClick={onToggleSidebar}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <PanelLeftIcon className="size-3.5" />
              </Button>
            </IconTooltip>
          ) : null}
        </div>

        <div className="mt-2.5">
          <WorkspaceSwitcher />
        </div>

        <div className="mt-4 flex items-center gap-1.5">
          <IconTooltip label={newChatLabel} side="bottom">
            <Button
              aria-label={newChatLabel}
              className="border-border/80 bg-muted/40 hover:bg-muted/70 text-foreground h-8 min-w-0 flex-1 justify-start gap-1.5 rounded-md px-2.5 text-[13px] shadow-none"
              onClick={onNewChat}
              type="button"
              variant="outline"
            >
              <PlusIcon className="size-3.5" />
              <span className="min-w-0 flex-1 truncate text-left">New chat</span>
            </Button>
          </IconTooltip>
          {canCreateShared && onNewSharedChat ? (
            <IconTooltip label="New shared chat" side="bottom">
              <Button
                aria-label="New shared chat"
                className="text-muted-foreground border-border/80 bg-muted/25 hover:bg-muted/50 size-8 shrink-0 rounded-md shadow-none"
                onClick={onNewSharedChat}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <UserPlusIcon className="size-3.5" />
              </Button>
            </IconTooltip>
          ) : null}
        </div>

        <nav aria-label="Workspace" className="mt-4 flex flex-col gap-1">
          <SidebarNavLink
            active={chatsActive}
            href="/chat"
            icon={MessageSquareIcon}
            label="Chats"
          />
          <SidebarNavLink
            active={playbooksActive}
            href="/playbooks"
            icon={BookmarkIcon}
            label="Playbooks"
          />
          <SidebarNavLink
            active={schedulesActive}
            href="/schedules"
            icon={CalendarClockIcon}
            label="Schedules"
          />
          <SidebarNavLink active={toolsActive} href="/tools" icon={HammerIcon} label="Tools" />
        </nav>
      </div>

      {recent.open ? (
        <IconTooltip label="Drag to resize · Double-click to fill" side="top">
          <div
            aria-label="Resize recent chats"
            className={cn(
              "group/resize relative z-20 w-full shrink-0 touch-none",
              recentFillsHeight ? "mt-2" : "mt-auto",
              resizingRecent ? "bg-border/50" : "hover:bg-border/40",
            )}
            onDoubleClick={() => updateRecent({ heightPx: null })}
            onPointerDown={(event) => {
              event.preventDefault();
              beginResizeRecent(event.clientY);
            }}
            style={{ cursor: "row-resize", height: 10 }}
          />
        </IconTooltip>
      ) : null}

      <div
        className={cn(
          "flex min-h-0 flex-col",
          recent.open ? (recentFillsHeight ? "min-h-0 flex-1" : "shrink-0") : "mt-auto shrink-0",
        )}
        ref={recentPanelRef}
        style={
          recent.open && recent.heightPx !== null
            ? { height: recent.heightPx, maxHeight: "calc(100% - 11rem)" }
            : undefined
        }
      >
        <Collapsible
          className={cn(
            "border-border/50 relative flex h-full min-h-0 flex-col border-t",
            recent.open && "bg-muted/20",
          )}
          onOpenChange={(open) => updateRecent({ open })}
          open={recent.open}
        >
          <div className="flex h-8 shrink-0 items-center gap-1 px-2">
            <CollapsibleTrigger asChild>
              <button
                aria-label={recent.open ? "Collapse recent chats" : "Expand recent chats"}
                className="text-muted-foreground hover:text-foreground flex h-7 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-left"
                type="button"
              >
                <span className="min-w-0 flex-1 truncate text-xs font-medium">Recent</span>
                {(showDraftRow ? 1 : 0) + chats.length > 0 ? (
                  <span className="text-muted-foreground/55 text-[11px] tabular-nums">
                    {(showDraftRow ? 1 : 0) + chats.length}
                  </span>
                ) : null}
                <ChevronDownIcon
                  className={cn(
                    "size-3.5 shrink-0 opacity-70 transition-transform",
                    recent.open ? "rotate-0" : "-rotate-90",
                  )}
                />
              </button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="flex min-h-0 flex-1 flex-col overflow-hidden data-[state=closed]:animate-none data-[state=open]:flex data-[state=open]:animate-none">
            <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-2 pb-2">
              <div className="relative shrink-0">
                <SearchIcon className="text-muted-foreground/70 pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
                <Input
                  aria-label="Search chats"
                  className={cn(
                    "bg-background/70 hover:bg-background focus-visible:border-border/70 focus-visible:bg-background h-7 rounded-md border-transparent pl-7 text-xs shadow-none",
                    hasActiveQuery ? "pr-7" : searchShortcutLabel ? "pr-9" : "pr-2",
                  )}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  ref={searchInputRef}
                  type="search"
                  value={query}
                />
                {hasActiveQuery ? (
                  <button
                    aria-label="Clear search"
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 inline-flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded"
                    onClick={() => {
                      setQuery("");
                      searchInputRef.current?.focus();
                    }}
                    type="button"
                  >
                    <XIcon className="size-3" />
                  </button>
                ) : searchShortcutLabel ? (
                  <span className="text-muted-foreground/40 pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] tracking-wide">
                    {searchShortcutLabel}
                  </span>
                ) : null}
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                {showDraftRow ? (
                  <div
                    aria-current="page"
                    className="bg-muted text-foreground rounded-md px-2 py-1.5 text-[13px] font-medium"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="line-clamp-1 min-w-0 flex-1">{draftTitle}</span>
                      {draftVisibility === "shared" ? (
                        <UsersIcon
                          aria-label="Shared with workspace"
                          className="text-muted-foreground/60 size-3 shrink-0"
                        />
                      ) : null}
                    </span>
                  </div>
                ) : null}
                {chats.length === 0 && !showDraftRow && !hasActiveQuery ? (
                  <p className="text-muted-foreground/65 px-2 py-4 text-center text-xs">
                    No chats yet
                  </p>
                ) : null}
                {hasActiveQuery && filteredChats.length === 0 ? (
                  <p className="text-muted-foreground/65 px-2 py-4 text-center text-xs">
                    No chats match
                  </p>
                ) : null}
                <ul className="flex flex-col gap-1">
                  {filteredChats.map((chat) => {
                    const selected = chat.id === activeChatId;
                    const editing = editingId === chat.id;
                    return (
                      <li key={chat.id}>
                        <div
                          className={cn(
                            "group flex items-center gap-0.5 rounded-md",
                            selected ? "bg-muted text-foreground" : "hover:bg-muted/55",
                          )}
                        >
                          {editing ? (
                            <input
                              aria-label={`Rename ${chat.title}`}
                              className="border-border bg-background text-foreground focus-visible:ring-ring/50 mx-1 my-0.5 min-w-0 flex-1 rounded-md border px-1.5 py-1 text-[13px] outline-none focus-visible:ring-2"
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
                                  ? "text-foreground font-medium"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                              onClick={() => onSelectChat(chat.id)}
                              type="button"
                            >
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="line-clamp-1 min-w-0 flex-1">{chat.title}</span>
                                {chat.visibility === "shared" ? (
                                  <UsersIcon
                                    aria-label="Shared with workspace"
                                    className="text-muted-foreground/55 size-3 shrink-0"
                                  />
                                ) : null}
                              </span>
                            </button>
                          )}
                          {!editing ? (
                            <>
                              {canCreateShared &&
                              onShareChat &&
                              chat.visibility === "personal" &&
                              viewerUserId &&
                              chat.userId === viewerUserId ? (
                                <IconTooltip label="Share with workspace" side="bottom">
                                  <Button
                                    aria-label={`Share ${chat.title} with workspace`}
                                    className="text-muted-foreground/45 hover:text-foreground size-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                    onClick={() => void onShareChat(chat.id)}
                                    size="icon-sm"
                                    type="button"
                                    variant="ghost"
                                  >
                                    <UsersIcon className="size-3" />
                                  </Button>
                                </IconTooltip>
                              ) : null}
                              <IconTooltip label="Rename" side="bottom">
                                <Button
                                  aria-label={`Rename ${chat.title}`}
                                  className="text-muted-foreground/45 hover:text-foreground size-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                  onClick={() => beginRename(chat)}
                                  size="icon-sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  <PencilIcon className="size-3" />
                                </Button>
                              </IconTooltip>
                              <IconTooltip label="Delete" side="bottom">
                                <Button
                                  aria-label={`Delete ${chat.title}`}
                                  className="text-muted-foreground/45 hover:text-foreground mr-0.5 size-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                  onClick={() => onDeleteChat(chat.id)}
                                  size="icon-sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  <Trash2Icon className="size-3" />
                                </Button>
                              </IconTooltip>
                            </>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </aside>
  );
}
