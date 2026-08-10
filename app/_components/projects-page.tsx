"use client";

import { FolderIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ProjectEditorDialog } from "@/components/chat/project-editor-dialog";
import { SettingsRowsSkeleton } from "@/components/loading/skeletons";
import { SettingsPanel, SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createChatProject,
  deleteChatProject,
  listChatProjects,
  updateChatProject,
} from "@/lib/chat/chat-projects-api";
import { CHATS_CHANGED_EVENT, notifyChatsChanged } from "@/lib/chat/chat-list-events";
import { chatUrl, createChat, listChats } from "@/lib/chat/chats-api";
import type { ChatProject, ChatSummary } from "@/lib/chat/store/types";

export function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<readonly ChatProject[]>([]);
  const [chats, setChats] = useState<readonly ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ChatProject | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [projectList, listed] = await Promise.all([listChatProjects(), listChats()]);
      setProjects(projectList);
      setChats(listed.chats);
      setError(null);
    } catch (cause) {
      setProjects([]);
      setChats([]);
      setError(cause instanceof Error ? cause.message : "Unable to load projects.");
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

  async function handleSaveProject(input: { readonly name: string }) {
    try {
      if (editingProject) {
        const project = await updateChatProject(editingProject.id, { name: input.name });
        setProjects((current) => current.map((item) => (item.id === project.id ? project : item)));
      } else {
        const project = await createChatProject({ name: input.name });
        setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
      }
      notifyChatsChanged();
      await refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to save project.";
      setError(message);
      throw cause instanceof Error ? cause : new Error(message);
    }
  }

  async function handleDeleteProject(project: ChatProject) {
    if (
      !window.confirm(
        `Delete “${project.name}”? Chats stay in your workspace and return to Recent.`,
      )
    ) {
      return;
    }
    setBusyId(project.id);
    try {
      await deleteChatProject(project.id);
      notifyChatsChanged();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete project.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleNewChatInProject(projectId: string) {
    setBusyId(projectId);
    try {
      const chat = await createChat({ projectId, visibility: "personal" });
      notifyChatsChanged();
      router.push(chatUrl(chat.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create chat.");
      setBusyId(null);
    }
  }

  return (
    <SettingsShell
      description="Group related chats under named projects."
      meta={
        <Button
          onClick={() => {
            setEditingProject(null);
            setEditorOpen(true);
          }}
          size="sm"
          type="button"
        >
          <PlusIcon className="size-3.5" />
          New project
        </Button>
      }
      title="Projects"
    >
      <ProjectEditorDialog
        onOpenChange={setEditorOpen}
        onSave={handleSaveProject}
        open={editorOpen}
        project={editingProject}
      />

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <SettingsPanel>
        {loading ? (
          <SettingsRowsSkeleton rows={3} />
        ) : projects.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            No projects yet. Create one to organize chats from All chats or a chat’s menu.
          </p>
        ) : (
          <ul className="divide-border/70 divide-y">
            {projects.map((project) => {
              const projectChats = chats.filter((chat) => chat.projectId === project.id);
              const busy = busyId === project.id;
              return (
                <li className="flex flex-col gap-3 px-4 py-3.5" key={project.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                        <FolderIcon className="size-4" />
                      </span>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium">{project.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {projectChats.length === 0
                            ? "No chats yet"
                            : `${projectChats.length} chat${projectChats.length === 1 ? "" : "s"}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        disabled={busy}
                        onClick={() => {
                          void handleNewChatInProject(project.id);
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <PlusIcon className="size-3.5" />
                        New chat
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-label={`Project actions for ${project.name}`}
                            disabled={busy}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 p-1">
                          <DropdownMenuItem
                            className="gap-2"
                            onSelect={() => {
                              setEditingProject(project);
                              setEditorOpen(true);
                            }}
                          >
                            <PencilIcon className="size-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2"
                            onSelect={() => {
                              void handleDeleteProject(project);
                            }}
                            variant="destructive"
                          >
                            <Trash2Icon className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {projectChats.length > 0 ? (
                    <ul className="border-border/60 ml-1 flex flex-col gap-1 border-l pl-3">
                      {projectChats.map((chat) => (
                        <li key={chat.id}>
                          <button
                            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full rounded-md px-2 py-1.5 text-left text-sm"
                            onClick={() => {
                              router.push(chatUrl(chat.id));
                            }}
                            type="button"
                          >
                            <span className="line-clamp-1">{chat.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SettingsPanel>
    </SettingsShell>
  );
}
