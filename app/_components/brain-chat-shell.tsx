"use client";

import { PanelLeftIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { ChatShellProvider } from "@/app/_components/chat-shell-context";
import {
  EphemeralAgentChat,
  type DisposeEphemeralChat,
} from "@/app/_components/ephemeral-agent-chat";
import { BrainMark } from "@/components/brain-mark";
import { ChatSidebar } from "@/components/chat/sidebar";
import { Button } from "@/components/ui/button";
import { createFallbackTitle } from "@/lib/chat/title";
import { cn } from "@/lib/utils";

export function BrainChatShell() {
  const [sessionKey, setSessionKey] = useState(0);
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const disposeChatRef = useRef<DisposeEphemeralChat | null>(null);
  const newChatPendingRef = useRef(false);

  const handleNewChat = useCallback(() => {
    if (newChatPendingRef.current) {
      return;
    }

    newChatPendingRef.current = true;
    void (async () => {
      const disposed = (await disposeChatRef.current?.()) ?? true;
      if (disposed) {
        setSessionKey((current) => current + 1);
        setTitle(null);
        setDraft("");
      }
      newChatPendingRef.current = false;
    })();
  }, []);

  const handleDisposeReady = useCallback((dispose: DisposeEphemeralChat | null) => {
    disposeChatRef.current = dispose;
  }, []);

  const handleUserMessage = useCallback((text: string) => {
    setTitle((current) => current ?? createFallbackTitle(text));
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
            brand={
              <span className="text-foreground flex min-w-0 items-center gap-2">
                <BrainMark className="size-5 shrink-0" />
                <span className="truncate font-semibold tracking-tight">Brain</span>
              </span>
            }
            currentTitle={title}
            onNewChat={handleNewChat}
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
              {title ?? "New chat"}
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
          <EphemeralAgentChat
            key={sessionKey}
            draft={draft}
            onDisposeReady={handleDisposeReady}
            onDraftChange={setDraft}
            onUserMessage={handleUserMessage}
          />
        </div>
      </div>
    </ChatShellProvider>
  );
}
