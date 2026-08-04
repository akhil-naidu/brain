"use client";

import { PanelLeftIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_CHAT_TITLE } from "@/lib/chat/title";
import type { ChatSummary } from "@/lib/chat/store/types";
import { cn } from "@/lib/utils";

export function ChatSidebar({
  brand,
  chats,
  className,
  activeChatId,
  currentTitle,
  onDeleteChat,
  onNewChat,
  onRenameChat,
  onSelectChat,
  onToggleSidebar,
}: {
  readonly brand: ReactNode;
  readonly chats: readonly ChatSummary[];
  readonly className?: string;
  readonly activeChatId: string | null;
  readonly currentTitle: string | null;
  readonly onDeleteChat: (chatId: string) => void;
  readonly onNewChat: () => void;
  readonly onRenameChat: (chatId: string, title: string) => void | Promise<void>;
  readonly onSelectChat: (chatId: string) => void;
  readonly onToggleSidebar?: () => void;
}) {
  const showDraftRow = !activeChatId;
  const draftTitle = currentTitle?.trim() || DEFAULT_CHAT_TITLE;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editingIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingId) {
      return;
    }
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingId]);

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
        {chats.length === 0 && !showDraftRow ? (
          <p className="text-muted-foreground/70 px-2 py-2 text-sm">No chats yet</p>
        ) : null}
        <ul className="flex flex-col gap-0.5">
          {chats.map((chat) => {
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
                      ref={inputRef}
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
      </div>
    </aside>
  );
}
