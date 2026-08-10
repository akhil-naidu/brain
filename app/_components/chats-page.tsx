"use client";

import { FolderIcon, MessageSquareIcon, PinIcon, SearchIcon, UsersIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatRowMenu } from "@/components/chat/chat-row-menu";
import { ProjectEditorDialog } from "@/components/chat/project-editor-dialog";
import { SettingsRowsSkeleton } from "@/components/loading/skeletons";
import { SettingsPanel, SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createChatProject, listChatProjects } from "@/lib/chat/chat-projects-api";
import { CHATS_CHANGED_EVENT, notifyChatsChanged } from "@/lib/chat/chat-list-events";
import { chatUrl, deleteChat, listChats, updateChat } from "@/lib/chat/chats-api";
import { filterChatsByTitle } from "@/lib/chat/filter-chats";
import { DEFAULT_CHAT_TITLE, normalizeChatTitle } from "@/lib/chat/title";
import type { ChatProject, ChatSummary } from "@/lib/chat/store/types";

type ChatListStatus = "active" | "archived";

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

function revisionOpts(chat: ChatSummary | undefined) {
  return chat?.visibility === "shared" ? { expectedRevision: chat.revision } : {};
}

export function ChatsPage() {
  const router = useRouter();
  const [chats, setChats] = useState<readonly ChatSummary[]>([]);
  const [projects, setProjects] = useState<readonly ChatProject[]>([]);
  const [status, setStatus] = useState<ChatListStatus>("active");
  const [canCreateShared, setCanCreateShared] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [projectEditorOpen, setProjectEditorOpen] = useState(false);
  const [moveChatId, setMoveChatId] = useState<string | null>(null);
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
      const [listed, projectList] = await Promise.all([listChats({ status }), listChatProjects()]);
      setChats(listed.chats);
      setProjects(projectList);
      setCanCreateShared(listed.canCreateShared);
      setViewerUserId(listed.viewerUserId);
      setError(null);
    } catch (cause) {
      setChats([]);
      setError(cause instanceof Error ? cause.message : "Unable to load chats.");
    } finally {
      setLoading(false);
    }
  }, [status]);

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
    const existing = chats.find((chat) => chat.id === chatId);
    setBusyId(chatId);
    try {
      await updateChat(chatId, { title, ...revisionOpts(existing) });
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

  async function handlePin(chatId: string, pinned: boolean) {
    const existing = chats.find((chat) => chat.id === chatId);
    setBusyId(chatId);
    try {
      await updateChat(chatId, { pinned, ...revisionOpts(existing) });
      notifyChatsChanged();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update pin.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive(chatId: string) {
    const existing = chats.find((chat) => chat.id === chatId);
    setBusyId(chatId);
    try {
      await updateChat(chatId, { archived: true, ...revisionOpts(existing) });
      notifyChatsChanged();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to archive chat.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnarchive(chatId: string) {
    const existing = chats.find((chat) => chat.id === chatId);
    setBusyId(chatId);
    try {
      await updateChat(chatId, { archived: false, ...revisionOpts(existing) });
      notifyChatsChanged();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to unarchive chat.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMoveToProject(chatId: string, projectId: string | null) {
    const existing = chats.find((chat) => chat.id === chatId);
    setBusyId(chatId);
    try {
      await updateChat(chatId, { projectId, ...revisionOpts(existing) });
      notifyChatsChanged();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to move chat.");
    } finally {
      setBusyId(null);
    }
  }

  function handleCreateProjectAndMove(chatId: string) {
    setMoveChatId(chatId);
    setProjectEditorOpen(true);
  }

  async function handleSaveProject(input: { readonly name: string }) {
    if (!moveChatId) {
      return;
    }
    const chatId = moveChatId;
    const existing = chats.find((chat) => chat.id === chatId);
    setBusyId(chatId);
    try {
      const project = await createChatProject({ name: input.name });
      setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
      await updateChat(chatId, { projectId: project.id, ...revisionOpts(existing) });
      notifyChatsChanged();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create project.");
      throw cause instanceof Error ? cause : new Error("Unable to create project.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SettingsShell
      description="Browse, rename, share, pin, archive, and organize chats in the active workspace."
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
      <ProjectEditorDialog
        onOpenChange={(open) => {
          setProjectEditorOpen(open);
          if (!open) {
            setMoveChatId(null);
          }
        }}
        onSave={handleSaveProject}
        open={projectEditorOpen}
        project={null}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          aria-pressed={status === "active"}
          onClick={() => {
            if (status === "active") {
              return;
            }
            setLoading(true);
            setChats([]);
            setStatus("active");
          }}
          size="sm"
          type="button"
          variant={status === "active" ? "secondary" : "ghost"}
        >
          Active
        </Button>
        <Button
          aria-pressed={status === "archived"}
          onClick={() => {
            if (status === "archived") {
              return;
            }
            setLoading(true);
            setChats([]);
            setStatus("archived");
          }}
          size="sm"
          type="button"
          variant={status === "archived" ? "secondary" : "ghost"}
        >
          Archived
        </Button>
      </div>

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
              : status === "archived"
                ? "No archived chats."
                : "No chats yet. Start a new conversation."}
          </p>
        ) : (
          <ul className="divide-border/70 divide-y">
            {filtered.map((chat) => {
              const title = chat.title.trim() || DEFAULT_CHAT_TITLE;
              const isOwner = !viewerUserId || chat.userId === viewerUserId;
              const canShare =
                status === "active" && canCreateShared && isOwner && chat.visibility === "personal";
              const busy = busyId === chat.id;
              const renaming = renamingId === chat.id;
              const pinned = chat.pinnedAt !== null;
              const projectName = chat.projectId
                ? projects.find((project) => project.id === chat.projectId)?.name
                : null;

              return (
                <li className="group flex items-center gap-2 px-3 py-2.5 sm:px-4" key={chat.id}>
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
                            {pinned ? (
                              <PinIcon
                                aria-label="Pinned"
                                className="text-muted-foreground/55 size-3.5 shrink-0"
                              />
                            ) : null}
                            {projectName ? (
                              <span className="text-muted-foreground bg-muted/60 inline-flex max-w-[8rem] shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                                <FolderIcon className="size-2.5 shrink-0" />
                                <span className="truncate">{projectName}</span>
                              </span>
                            ) : null}
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
                      <ChatRowMenu
                        canShare={canShare}
                        chatTitle={title}
                        onArchive={
                          status === "active"
                            ? () => {
                                void handleArchive(chat.id);
                              }
                            : undefined
                        }
                        onCreateProject={
                          status === "active"
                            ? () => {
                                handleCreateProjectAndMove(chat.id);
                              }
                            : undefined
                        }
                        onDelete={() => {
                          void handleDelete(chat.id);
                        }}
                        onMoveToProject={
                          status === "active"
                            ? (projectId) => {
                                void handleMoveToProject(chat.id, projectId);
                              }
                            : undefined
                        }
                        onPin={
                          status === "active"
                            ? () => {
                                void handlePin(chat.id, !pinned);
                              }
                            : undefined
                        }
                        onRename={
                          status === "active"
                            ? () => {
                                setRenamingId(chat.id);
                                setRenameValue(title);
                              }
                            : undefined
                        }
                        onShare={
                          canShare
                            ? () => {
                                void handleShare(chat.id);
                              }
                            : undefined
                        }
                        onUnarchive={
                          status === "archived"
                            ? () => {
                                void handleUnarchive(chat.id);
                              }
                            : undefined
                        }
                        pinned={pinned}
                        projectId={chat.projectId}
                        projects={projects}
                        triggerVisible="always"
                      />
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
