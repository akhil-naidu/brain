"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChatNavProvider, useChatNav } from "@/app/_components/chat-nav-context";
import { ChatShellProvider } from "@/app/_components/chat-shell-context";
import { BrainMark } from "@/components/brain-mark";
import { ChatSidebar } from "@/components/chat/sidebar";
import { Button } from "@/components/ui/button";
import {
  chatUrl,
  deleteChat,
  listChats,
  readChatIdFromLocation,
  updateChat,
} from "@/lib/chat/chats-api";
import {
  isFocusChatSearchShortcutEvent,
  isNewChatShortcutEvent,
  isSlashFocusChatSearchEvent,
  isToggleSidebarShortcutEvent,
} from "@/lib/chat/keyboard";
import { stashPendingPlaybookRun } from "@/lib/chat/pending-playbook-run";
import { readSidebarExpanded, writeSidebarExpanded } from "@/lib/chat/sidebar-expanded";
import { normalizeChatTitle } from "@/lib/chat/title";
import type { ChatSummary } from "@/lib/chat/store/types";
import { cn } from "@/lib/utils";

function upsertChatSummary(chats: readonly ChatSummary[], chat: ChatSummary): ChatSummary[] {
  const rest = chats.filter((item) => item.id !== chat.id);
  return [chat, ...rest].toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function BrainAppShellInner({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { handlers } = useChatNav();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [chats, setChats] = useState<readonly ChatSummary[]>([]);
  const [searchFocusRequest, setSearchFocusRequest] = useState(0);
  const [urlChatId, setUrlChatId] = useState<string | null>(null);

  useEffect(() => {
    setSidebarExpanded(readSidebarExpanded());
    setUrlChatId(readChatIdFromLocation());
  }, []);

  useEffect(() => {
    const sync = () => setUrlChatId(readChatIdFromLocation());
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const listed = await listChats();
        if (!cancelled) {
          setChats([...listed]);
        }
      } catch {
        if (!cancelled) {
          setChats([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const setExpanded = useCallback((expanded: boolean) => {
    setSidebarExpanded(expanded);
    writeSidebarExpanded(expanded);
  }, []);

  const toggleExpanded = useCallback(() => {
    setExpanded(!sidebarExpanded);
  }, [setExpanded, sidebarExpanded]);

  const onNewChat = useCallback(() => {
    if (handlers) {
      handlers.onNewChat();
      return;
    }
    router.push("/chat");
  }, [handlers, router]);

  const onSelectChat = useCallback(
    (chatId: string) => {
      if (handlers) {
        handlers.onSelectChat(chatId);
        return;
      }
      router.push(chatUrl(chatId));
    },
    [handlers, router],
  );

  const onDeleteChat = useCallback(
    (chatId: string) => {
      if (handlers) {
        handlers.onDeleteChat(chatId);
        return;
      }
      void (async () => {
        await deleteChat(chatId);
        setChats((current) => current.filter((chat) => chat.id !== chatId));
        if (readChatIdFromLocation() === chatId) {
          router.push("/chat");
        }
      })();
    },
    [handlers, router],
  );

  const onRenameChat = useCallback(
    async (chatId: string, title: string) => {
      if (handlers) {
        await handlers.onRenameChat(chatId, title);
        return;
      }
      const chat = await updateChat(chatId, { title: normalizeChatTitle(title) });
      setChats((current) => upsertChatSummary(current, chat));
    },
    [handlers],
  );

  const onRunPlaybook = useCallback(
    (prompt: string) => {
      if (handlers) {
        handlers.onRunPlaybook(prompt);
        return;
      }
      stashPendingPlaybookRun(prompt);
      router.push("/chat");
    },
    [handlers, router],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isNewChatShortcutEvent(event)) {
        event.preventDefault();
        onNewChat();
        return;
      }
      if (isFocusChatSearchShortcutEvent(event) || isSlashFocusChatSearchEvent(event)) {
        event.preventDefault();
        setExpanded(true);
        setMobileDrawerOpen(true);
        setSearchFocusRequest((current) => current + 1);
        return;
      }
      if (isToggleSidebarShortcutEvent(event)) {
        event.preventDefault();
        if (window.matchMedia("(max-width: 767px)").matches) {
          setMobileDrawerOpen((open) => !open);
        } else {
          toggleExpanded();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onNewChat, setExpanded, toggleExpanded]);

  // Keep shell chat list in sync when chat workspace creates/updates chats.
  useEffect(() => {
    if (!handlers) {
      return;
    }
    // Refresh list when returning from chat workspace remounts / title changes.
    void listChats()
      .then((listed) => setChats([...listed]))
      .catch(() => undefined);
  }, [handlers?.activeChatId, handlers?.currentTitle, handlers]);

  const activeChatId = handlers?.activeChatId ?? (pathname === "/chat" ? urlChatId : null);
  const currentTitle =
    handlers?.currentTitle ??
    (pathname === "/playbooks" ? "Playbooks" : pathname === "/schedules" ? "Schedules" : null);

  const headerTitle =
    pathname === "/playbooks"
      ? "Playbooks"
      : pathname === "/schedules"
        ? "Schedules"
        : (handlers?.currentTitle ?? "New chat");

  const closeMobileDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
  }, []);

  const sidebarBrand = (
    <Link className="text-foreground flex min-w-0 items-center gap-2" href="/chat">
      <BrainMark className="size-5 shrink-0" />
      <span className="truncate font-semibold tracking-tight">Brain</span>
    </Link>
  );

  const compactBrand = <BrainMark className="size-5 shrink-0" />;

  const sidebarProps = {
    activeChatId,
    chats,
    currentTitle: pathname === "/chat" ? currentTitle : null,
    onDeleteChat,
    onRenameChat,
    onRunPlaybook,
    searchFocusRequest,
    showChatDraft: pathname === "/chat",
  } as const;

  return (
    <div className="bg-background text-foreground flex h-dvh">
      <div
        className={cn(
          "hidden h-full shrink-0 overflow-hidden transition-[width] duration-200 md:block",
          sidebarExpanded ? "w-64" : "w-14",
        )}
      >
        <ChatSidebar
          {...sidebarProps}
          brand={sidebarExpanded ? sidebarBrand : compactBrand}
          compact={!sidebarExpanded}
          onNewChat={onNewChat}
          onSelectChat={onSelectChat}
          onToggleSidebar={toggleExpanded}
        />
      </div>

      {/* Mobile: compact rail always + optional expanded drawer */}
      <div className="h-full shrink-0 md:hidden">
        <ChatSidebar
          {...sidebarProps}
          brand={compactBrand}
          compact
          onNewChat={() => {
            closeMobileDrawer();
            onNewChat();
          }}
          onSelectChat={(chatId) => {
            closeMobileDrawer();
            onSelectChat(chatId);
          }}
          onToggleSidebar={() => setMobileDrawerOpen(true)}
        />
      </div>

      {mobileDrawerOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close sidebar"
            className="absolute inset-0 bg-black/40"
            onClick={closeMobileDrawer}
            type="button"
          />
          <div className="border-border bg-background absolute inset-y-0 left-0 shadow-xl">
            <ChatSidebar
              {...sidebarProps}
              brand={sidebarBrand}
              onNewChat={() => {
                closeMobileDrawer();
                onNewChat();
              }}
              onSelectChat={(chatId) => {
                closeMobileDrawer();
                onSelectChat(chatId);
              }}
              onToggleSidebar={closeMobileDrawer}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border/50 flex h-12 items-center gap-2 border-b px-3 md:px-4">
          <div className="text-muted-foreground min-w-0 flex-1 truncate text-sm">{headerTitle}</div>
          {handlers?.threadActions?.canCopy ? (
            <Button
              aria-label={
                handlers.copyState === "copied"
                  ? "Copied"
                  : handlers.copyState === "error"
                    ? "Copy failed"
                    : "Copy chat as Markdown"
              }
              className={cn(
                "text-muted-foreground",
                handlers.copyState === "error" ? "text-destructive" : undefined,
              )}
              onClick={handlers.onCopyChat}
              size="icon-sm"
              title={
                handlers.copyState === "copied"
                  ? "Copied"
                  : handlers.copyState === "error"
                    ? "Couldn't copy — check clipboard permissions"
                    : "Copy chat as Markdown"
              }
              type="button"
              variant="ghost"
            >
              {handlers.copyState === "copied" ? (
                <CheckIcon className="size-4" />
              ) : (
                <CopyIcon className="size-4" />
              )}
            </Button>
          ) : null}
        </header>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function BrainAppShell({ children }: { readonly children: ReactNode }) {
  return (
    <ChatShellProvider>
      <ChatNavProvider>
        <BrainAppShellInner>{children}</BrainAppShellInner>
      </ChatNavProvider>
    </ChatShellProvider>
  );
}
