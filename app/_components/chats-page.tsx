"use client";

import {
  MessageSquareIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SettingsRowsSkeleton } from "@/components/loading/skeletons";
import { SettingsPanel, SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconTooltip } from "@/components/ui/tooltip";
import { CHATS_CHANGED_EVENT, notifyChatsChanged } from "@/lib/chat/chat-list-events";
import { chatUrl, deleteChat, listChats, updateChat } from "@/lib/chat/chats-api";
import { filterChatsByTitle } from "@/lib/chat/filter-chats";
import { DEFAULT_CHAT_TITLE, normalizeChatTitle } from "@/lib/chat/title";
import type { ChatSummary } from "@/lib/chat/store/types";
import { cn } from "@/lib/utils";

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function ChatsPage() {
  const router = useRouter();
  const [chats, setChats] = useState<readonly ChatSummary[]>([]);
  const [canCreateShared, setCanCreateShared] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!renamingId) {
      return;
    }
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [renamingId]);

  const refresh = useCallback(async () => {
    try {
      const listed = await listChats();
      setChats(listed.chats);
      setCanCreateShared(listed.canCreateShared);
      setViewerUserId(listed.viewerUserId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load chats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onChanged = () => {
      void refresh();
    };
    window.addEventListener(CHATS_CHANGED_EVENT, onChanged);
    window.addEventListener("focus", onChanged);
    return () => {
      window.removeEventListener(CHATS_CHANGED_EVENT, onChanged);
      window.removeEventListener("focus", onChanged);
    };
  }, [refresh]);

  const filtered = filterChatsByTitle(chats, query);

  async function handleRename(chatId: string) {
    const title = normalizeChatTitle(renameValue);
    setBusyId(chatId);
    try {
      await updateChat(chatId, { title });
      setRenamingId(null);
      notifyChatsChanged();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to rename chat.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(chatId: string) {
    setBusyId(chatId);
    try {
      await deleteChat(chatId);
      notifyChatsChanged();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete chat.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleShare(chatId: string) {
    setBusyId(chatId);
    try {
      await updateChat(chatId, { visibility: "shared" });
      notifyChatsChanged();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to share chat.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SettingsShell
      description="Browse, rename, share, and delete chats in the active workspace."
      meta={
        <Button
          onClick={() => {
            router.push("/chat");
          }}
          size="sm"
          type="button"
        >
          <MessageSquareIcon className="size-3.5" />
          New chat
        </Button>
      }
      title="All chats"
    >
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
        <Input
          aria-label="Search chats"
          className="bg-background/70 h-9 pl-9"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search chats"
          value={query}
        />
        {query ? (
          <button
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md"
            onClick={() => setQuery("")}
            type="button"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <SettingsPanel>
        {loading ? (
          <SettingsRowsSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            {query.trim()
              ? "No chats match your search."
              : "No chats yet. Start a new conversation."}
          </p>
        ) : (
          <ul className="divide-border/70 divide-y">
            {filtered.map((chat) => {
              const title = chat.title.trim() || DEFAULT_CHAT_TITLE;
              const isOwner = !viewerUserId || chat.userId === viewerUserId;
              const canShare = canCreateShared && isOwner && chat.visibility === "personal";
              const busy = busyId === chat.id;
              const renaming = renamingId === chat.id;

              return (
                <li className="flex items-center gap-2 px-3 py-2.5 sm:px-4" key={chat.id}>
                  {renaming ? (
                    <form
                      className="flex min-w-0 flex-1 items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleRename(chat.id);
                      }}
                    >
                      <Input
                        aria-label={`Rename ${title}`}
                        className="h-8"
                        disabled={busy}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault();
                            setRenamingId(null);
                          }
                        }}
                        ref={renameInputRef}
                        value={renameValue}
                      />
                      <Button disabled={busy} size="sm" type="submit">
                        Save
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => setRenamingId(null)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <>
                      <button
                        className="hover:bg-muted/40 flex min-w-0 flex-1 items-start gap-3 rounded-lg px-1 py-1 text-left transition-colors"
                        disabled={busy}
                        onClick={() => {
                          router.push(chatUrl(chat.id));
                        }}
                        type="button"
                      >
                        <span className="bg-muted text-muted-foreground mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl">
                          {chat.visibility === "shared" ? (
                            <UsersIcon className="size-4" />
                          ) : (
                            <MessageSquareIcon className="size-4" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-foreground flex min-w-0 items-center gap-2 text-sm font-medium">
                            <span className="truncate">{title}</span>
                            {chat.visibility === "shared" ? (
                              <span className="text-muted-foreground bg-muted/60 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                                Shared
                              </span>
                            ) : null}
                          </span>
                          <span className="text-muted-foreground mt-0.5 block text-xs">
                            {formatUpdatedAt(chat.updatedAt)}
                          </span>
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {canShare ? (
                          <IconTooltip label="Share with workspace" side="top">
                            <Button
                              aria-label={`Share ${title}`}
                              className="text-muted-foreground size-8"
                              disabled={busy}
                              onClick={() => {
                                void handleShare(chat.id);
                              }}
                              size="icon-sm"
                              type="button"
                              variant="ghost"
                            >
                              <UserPlusIcon className="size-3.5" />
                            </Button>
                          </IconTooltip>
                        ) : null}
                        <IconTooltip label="Rename" side="top">
                          <Button
                            aria-label={`Rename ${title}`}
                            className="text-muted-foreground size-8"
                            disabled={busy}
                            onClick={() => {
                              setRenamingId(chat.id);
                              setRenameValue(title);
                            }}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <PencilIcon className="size-3.5" />
                          </Button>
                        </IconTooltip>
                        <IconTooltip label="Delete" side="top">
                          <Button
                            aria-label={`Delete ${title}`}
                            className={cn("text-muted-foreground size-8", "hover:text-destructive")}
                            disabled={busy}
                            onClick={() => {
                              void handleDelete(chat.id);
                            }}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </IconTooltip>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SettingsPanel>
    </SettingsShell>
  );
}
