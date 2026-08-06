"use client";

import type { HandleMessageStreamEvent, SessionState } from "eve/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChatNav } from "@/app/_components/chat-nav-context";
import {
  EphemeralAgentChat,
  type ChatThreadActions,
  type DisposeEphemeralChat,
} from "@/app/_components/ephemeral-agent-chat";
import {
  deleteChat,
  getChat,
  listChats,
  readChatIdFromLocation,
  replaceChatUrl,
  updateChat,
} from "@/lib/chat/chats-api";
import { stashPendingChatVisibility } from "@/lib/chat/pending-chat-visibility";
import { stashPendingPlaybookRun } from "@/lib/chat/pending-playbook-run";
import { createFallbackTitle, normalizeChatTitle } from "@/lib/chat/title";
import type { ChatRecord, ChatSummary } from "@/lib/chat/store/types";

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

export function ChatWorkspace() {
  const { setHandlers } = useChatNav();
  const [draft, setDraft] = useState("");
  const [active, setActive] = useState<ActiveChatState>(() => emptyActive(0));
  const [bootstrapped, setBootstrapped] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [threadActions, setThreadActions] = useState<ChatThreadActions | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const disposeChatRef = useRef<DisposeEphemeralChat | null>(null);
  const navigationPendingRef = useRef(false);
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await listChats();
        const urlChatId = readChatIdFromLocation();
        if (!urlChatId) {
          if (!cancelled) {
            setBootstrapped(true);
          }
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
        if (!cancelled) {
          setBootstrapped(true);
        }
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

  const handleThreadActionsReady = useCallback((actions: ChatThreadActions | null) => {
    setThreadActions(actions);
    setCopyState("idle");
  }, []);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyChat = useCallback(() => {
    if (!threadActions?.canCopy) {
      return;
    }
    void (async () => {
      try {
        await threadActions.copyAsMarkdown(active.title);
        setCopyState("copied");
        if (copyResetTimeoutRef.current) {
          clearTimeout(copyResetTimeoutRef.current);
        }
        copyResetTimeoutRef.current = setTimeout(() => {
          setCopyState("idle");
        }, 2000);
      } catch {
        setCopyState("error");
        if (copyResetTimeoutRef.current) {
          clearTimeout(copyResetTimeoutRef.current);
        }
        copyResetTimeoutRef.current = setTimeout(() => {
          setCopyState("idle");
        }, 2500);
      }
    })();
  }, [active.title, threadActions]);

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
      stashPendingChatVisibility("personal");
      replaceChatUrl(null);
      setDraft("");
      setActive((current) => emptyActive(current.remountKey + 1));
    });
  }, [runWithDisposal]);

  const handleNewSharedChat = useCallback(() => {
    void runWithDisposal(() => {
      stashPendingChatVisibility("shared");
      replaceChatUrl(null);
      setDraft("");
      setActive((current) => emptyActive(current.remountKey + 1));
    });
  }, [runWithDisposal]);

  const handleRunPlaybook = useCallback(
    (prompt: string) => {
      stashPendingPlaybookRun(prompt);
      handleNewChat();
    },
    [handleNewChat],
  );

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
        if (active.id === chatId) {
          replaceChatUrl(null);
          setDraft("");
          setActive((current) => emptyActive(current.remountKey + 1));
        }
      });
    },
    [active.id, runWithDisposal],
  );

  const handleRenameChat = useCallback(async (chatId: string, title: string) => {
    try {
      const chat = await updateChat(chatId, { title: normalizeChatTitle(title) });
      setActive((current) =>
        current.id === chat.id ? { ...current, title: chat.title } : current,
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to rename chat.");
    }
  }, []);

  const handleChatCreated = useCallback((chat: ChatRecord) => {
    replaceChatUrl(chat.id);
    setActive((current) => ({
      ...current,
      id: chat.id,
      title: chat.title,
    }));
  }, []);

  const handleChatUpdated = useCallback((chat: ChatSummary) => {
    setActive((current) => (current.id === chat.id ? { ...current, title: chat.title } : current));
  }, []);

  const handleUserMessage = useCallback((text: string) => {
    setActive((current) => ({
      ...current,
      title: current.title ?? createFallbackTitle(text),
    }));
  }, []);

  useEffect(() => {
    setHandlers({
      activeChatId: active.id,
      currentTitle: active.title,
      threadActions,
      copyState,
      onCopyChat: handleCopyChat,
      onDeleteChat: handleDeleteChat,
      onNewChat: handleNewChat,
      onNewSharedChat: handleNewSharedChat,
      onRenameChat: handleRenameChat,
      onRunPlaybook: handleRunPlaybook,
      onSelectChat: handleSelectChat,
    });
    return () => setHandlers(null);
  }, [
    active.id,
    active.title,
    copyState,
    handleCopyChat,
    handleDeleteChat,
    handleNewChat,
    handleNewSharedChat,
    handleRenameChat,
    handleRunPlaybook,
    handleSelectChat,
    setHandlers,
    threadActions,
  ]);

  if (!bootstrapped) {
    return (
      <div className="flex h-full items-center justify-center px-4 sm:px-6">
        <p className="text-muted-foreground w-full max-w-3xl text-sm">Loading chats…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center px-4 sm:px-6">
        <p className="text-destructive w-full max-w-3xl text-sm">{loadError}</p>
      </div>
    );
  }

  return (
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
      onOpenChat={handleSelectChat}
      onThreadActionsReady={handleThreadActionsReady}
      onUserMessage={handleUserMessage}
    />
  );
}
