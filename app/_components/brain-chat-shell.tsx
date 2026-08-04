"use client";

import type { HandleMessageStreamEvent, SessionState } from "eve/client";
import { PanelLeftIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatShellProvider } from "@/app/_components/chat-shell-context";
import {
  EphemeralAgentChat,
  type DisposeEphemeralChat,
} from "@/app/_components/ephemeral-agent-chat";
import { BrainMark } from "@/components/brain-mark";
import { ChatSidebar } from "@/components/chat/sidebar";
import { Button } from "@/components/ui/button";
import {
  deleteChat,
  getChat,
  listChats,
  readChatIdFromLocation,
  replaceChatUrl,
} from "@/lib/chat/chats-api";
import type { ChatRecord, ChatSummary } from "@/lib/chat/store/types";
import { createFallbackTitle } from "@/lib/chat/title";
import { cn } from "@/lib/utils";

type ActiveChatState = {
  readonly id: string | null;
  readonly title: string | null;
  readonly initialSession: SessionState | null;
  readonly initialEvents: readonly HandleMessageStreamEvent[];
  readonly remountKey: number;
};

function emptyActive(remountKey: number): ActiveChatState {
  return {
    id: null,
    title: null,
    initialSession: null,
    initialEvents: [],
    remountKey,
  };
}

function toSummary(chat: ChatRecord | ChatSummary): ChatSummary {
  return {
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
}

function upsertChatSummary(chats: readonly ChatSummary[], chat: ChatSummary): ChatSummary[] {
  const rest = chats.filter((item) => item.id !== chat.id);
  return [chat, ...rest].toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function BrainChatShell() {
  const [draft, setDraft] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [active, setActive] = useState<ActiveChatState>(() => emptyActive(0));
  const [bootstrapped, setBootstrapped] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const disposeChatRef = useRef<DisposeEphemeralChat | null>(null);
  const navigationPendingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const listed = await listChats();
        if (cancelled) {
          return;
        }
        setChats([...listed]);

        const urlChatId = readChatIdFromLocation();
        if (!urlChatId) {
          setBootstrapped(true);
          return;
        }

        try {
          const chat = await getChat(urlChatId);
          if (cancelled) {
            return;
          }
          setActive({
            id: chat.id,
            title: chat.title,
            initialSession: chat.eveSession,
            initialEvents: chat.events,
            remountKey: 0,
          });
        } catch {
          replaceChatUrl(null);
          setActive(emptyActive(0));
        }
        setBootstrapped(true);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load chats.");
          setBootstrapped(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDisposeReady = useCallback((dispose: DisposeEphemeralChat | null) => {
    disposeChatRef.current = dispose;
  }, []);

  const runWithDisposal = useCallback(async (action: () => void | Promise<void>) => {
    if (navigationPendingRef.current) {
      return;
    }
    navigationPendingRef.current = true;
    try {
      const disposed = (await disposeChatRef.current?.()) ?? true;
      if (disposed) {
        await action();
      }
    } finally {
      navigationPendingRef.current = false;
    }
  }, []);

  const handleNewChat = useCallback(() => {
    void runWithDisposal(() => {
      replaceChatUrl(null);
      setDraft("");
      setActive((current) => emptyActive(current.remountKey + 1));
    });
  }, [runWithDisposal]);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      if (chatId === active.id) {
        return;
      }

      void runWithDisposal(async () => {
        const chat = await getChat(chatId);
        replaceChatUrl(chat.id);
        setDraft("");
        setActive((current) => ({
          id: chat.id,
          title: chat.title,
          initialSession: chat.eveSession,
          initialEvents: chat.events,
          remountKey: current.remountKey + 1,
        }));
      });
    },
    [active.id, runWithDisposal],
  );

  const handleDeleteChat = useCallback(
    (chatId: string) => {
      void runWithDisposal(async () => {
        await deleteChat(chatId);
        setChats((current) => current.filter((chat) => chat.id !== chatId));
        if (active.id === chatId) {
          replaceChatUrl(null);
          setDraft("");
          setActive((current) => emptyActive(current.remountKey + 1));
        }
      });
    },
    [active.id, runWithDisposal],
  );

  const handleChatCreated = useCallback((chat: ChatRecord) => {
    replaceChatUrl(chat.id);
    setActive((current) => ({
      ...current,
      id: chat.id,
      title: chat.title,
    }));
    setChats((current) => upsertChatSummary(current, toSummary(chat)));
  }, []);

  const handleChatUpdated = useCallback((chat: ChatSummary) => {
    setChats((current) => upsertChatSummary(current, chat));
    setActive((current) => (current.id === chat.id ? { ...current, title: chat.title } : current));
  }, []);

  const handleUserMessage = useCallback((text: string) => {
    setActive((current) => ({
      ...current,
      title: current.title ?? createFallbackTitle(text),
    }));
  }, []);

  return (
    <ChatShellProvider>
      <div className="bg-background text-foreground flex h-dvh">
        <div
          className={cn(
            "hidden h-full shrink-0 overflow-hidden transition-[width] duration-200 md:block",
            sidebarOpen ? "w-64" : "w-0",
          )}
        >
          <ChatSidebar
            activeChatId={active.id}
            brand={
              <span className="text-foreground flex min-w-0 items-center gap-2">
                <BrainMark className="size-5 shrink-0" />
                <span className="truncate font-semibold tracking-tight">Brain</span>
              </span>
            }
            chats={chats}
            currentTitle={active.title}
            onDeleteChat={handleDeleteChat}
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
            onToggleSidebar={() => setSidebarOpen(false)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-border/60 flex h-12 items-center gap-2 border-b px-3 md:px-4">
            {!sidebarOpen ? (
              <Button
                aria-label="Open sidebar"
                className="text-muted-foreground"
                onClick={() => setSidebarOpen(true)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <PanelLeftIcon className="size-4" />
              </Button>
            ) : null}
            <div className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
              {active.title ?? "New chat"}
            </div>
            <Button
              className="md:hidden"
              onClick={handleNewChat}
              size="sm"
              type="button"
              variant="outline"
            >
              New chat
            </Button>
          </header>
          {!bootstrapped ? (
            <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
              Loading chats…
            </div>
          ) : loadError ? (
            <div className="text-destructive flex flex-1 items-center justify-center px-4 text-center text-sm">
              {loadError}
            </div>
          ) : (
            <EphemeralAgentChat
              key={active.remountKey}
              chatId={active.id}
              draft={draft}
              initialEvents={active.initialEvents}
              initialSession={active.initialSession}
              onChatCreated={handleChatCreated}
              onChatUpdated={handleChatUpdated}
              onDisposeReady={handleDisposeReady}
              onDraftChange={setDraft}
              onUserMessage={handleUserMessage}
            />
          )}
        </div>
      </div>
    </ChatShellProvider>
  );
}
