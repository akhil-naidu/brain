"use client";

import { useEveAgent } from "eve/react";
import { PanelLeftIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { ChatShellProvider } from "@/app/_components/chat-shell-context";
import { EphemeralAgentChat } from "@/app/_components/ephemeral-agent-chat";
import { BrainMark } from "@/components/brain-mark";
import { ChatSidebar } from "@/components/chat/sidebar";
import { Button } from "@/components/ui/button";
import { createFallbackTitle } from "@/lib/chat/title";
import { cn } from "@/lib/utils";

export function BrainChatShell() {
  const agent = useEveAgent();
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleNewChat = useCallback(() => {
    agent.reset();
    setTitle(null);
    setDraft("");
  }, [agent]);

  const handleUserMessage = useCallback((text: string) => {
    setTitle((current) => current ?? createFallbackTitle(text));
  }, []);

  return (
    <ChatShellProvider>
      <div className="flex h-dvh bg-background text-foreground">
        <div
          className={cn(
            "hidden h-full shrink-0 overflow-hidden transition-[width] duration-200 md:block",
            sidebarOpen ? "w-64" : "w-0",
          )}
        >
          <ChatSidebar
            brand={
              <span className="flex min-w-0 items-center gap-2 text-foreground">
                <BrainMark className="size-5 shrink-0 text-primary" />
                <span className="truncate font-semibold tracking-tight">Brain</span>
              </span>
            }
            currentTitle={title}
            onNewChat={handleNewChat}
            onToggleSidebar={() => setSidebarOpen(false)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 items-center gap-2 border-b border-border/60 px-3 md:px-4">
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
            <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
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
            agent={agent}
            draft={draft}
            onDraftChange={setDraft}
            onUserMessage={handleUserMessage}
          />
        </div>
      </div>
    </ChatShellProvider>
  );
}
