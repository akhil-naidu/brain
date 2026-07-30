"use client";

import { PanelLeftIcon, PlusIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_CHAT_TITLE } from "@/lib/chat/title";
import { cn } from "@/lib/utils";

export function ChatSidebar({
  brand,
  className,
  currentTitle,
  onNewChat,
  onToggleSidebar,
}: {
  readonly brand: ReactNode;
  readonly className?: string;
  readonly currentTitle: string | null;
  readonly onNewChat: () => void;
  readonly onToggleSidebar?: () => void;
}) {
  const sessionTitle = currentTitle?.trim() || DEFAULT_CHAT_TITLE;
  const hasActiveSession = Boolean(currentTitle?.trim());

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
              aria-label="Close sidebar"
              className="text-muted-foreground/55 hover:text-muted-foreground"
              onClick={onToggleSidebar}
              size="icon-sm"
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
          type="button"
        >
          <PlusIcon className="size-4 shrink-0" />
          <span>New chat</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <p className="text-muted-foreground/70 px-2 pb-1 text-[11px] font-medium tracking-wide uppercase">
          This session
        </p>
        {hasActiveSession ? (
          <div
            aria-current="page"
            className="bg-muted/50 text-foreground rounded-md px-2 py-2 text-sm"
          >
            <span className="line-clamp-2">{sessionTitle}</span>
          </div>
        ) : (
          <p className="text-muted-foreground/70 px-2 py-2 text-sm">No messages yet</p>
        )}
      </div>
    </aside>
  );
}
