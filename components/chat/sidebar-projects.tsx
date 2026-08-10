"use client";

import {
  ChevronDownIcon,
  FolderIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconTooltip } from "@/components/ui/tooltip";
import type { ChatProject, ChatSummary } from "@/lib/chat/store/types";
import { cn } from "@/lib/utils";

function ProjectSection({
  chats,
  onDeleteProject,
  onNewChatInProject,
  onRenameProject,
  project,
  renderChatRow,
}: {
  readonly chats: readonly ChatSummary[];
  readonly onDeleteProject?: (projectId: string) => void;
  readonly onNewChatInProject?: (projectId: string) => void;
  readonly onRenameProject?: (project: ChatProject) => void;
  readonly project: ChatProject;
  readonly renderChatRow: (chat: ChatSummary) => ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <div className="group/project flex h-7 items-center gap-0.5 px-0.5">
        <CollapsibleTrigger asChild>
          <button
            aria-label={open ? `Collapse ${project.name}` : `Expand ${project.name}`}
            className="text-muted-foreground hover:text-foreground flex h-7 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-left"
            type="button"
          >
            <FolderIcon className="size-3.5 shrink-0 opacity-80" />
            <span className="min-w-0 flex-1 truncate text-xs font-medium">{project.name}</span>
            {chats.length > 0 ? (
              <span className="text-muted-foreground/55 text-[11px] tabular-nums">
                {chats.length}
              </span>
            ) : null}
            <ChevronDownIcon
              className={cn(
                "size-3.5 shrink-0 opacity-70 transition-transform",
                open ? "rotate-0" : "-rotate-90",
              )}
            />
          </button>
        </CollapsibleTrigger>
        {onNewChatInProject || onRenameProject || onDeleteProject ? (
          <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={`Project actions for ${project.name}`}
                className={cn(
                  "text-muted-foreground/55 hover:text-foreground size-6 shrink-0 transition-opacity",
                  menuOpen
                    ? "opacity-100"
                    : "opacity-0 group-hover/project:opacity-100 focus-visible:opacity-100",
                )}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <MoreHorizontalIcon className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 p-1">
              {onNewChatInProject ? (
                <DropdownMenuItem
                  className="gap-2"
                  onSelect={() => {
                    onNewChatInProject(project.id);
                  }}
                >
                  <PlusIcon className="size-4" />
                  New chat
                </DropdownMenuItem>
              ) : null}
              {onRenameProject ? (
                <DropdownMenuItem
                  className="gap-2"
                  onSelect={() => {
                    onRenameProject(project);
                  }}
                >
                  <PencilIcon className="size-4" />
                  Rename
                </DropdownMenuItem>
              ) : null}
              {onDeleteProject ? (
                <DropdownMenuItem
                  className="gap-2"
                  onSelect={() => {
                    onDeleteProject(project.id);
                  }}
                  variant="destructive"
                >
                  <Trash2Icon className="size-4" />
                  Delete
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <CollapsibleContent className="data-[state=closed]:animate-none data-[state=open]:animate-none">
        <ul className="flex flex-col gap-1 pb-1 pl-1">
          {chats.length === 0 ? (
            <li className="text-muted-foreground/65 px-2 py-1.5 text-[11px]">No chats yet</li>
          ) : (
            chats.map((chat) => <li key={chat.id}>{renderChatRow(chat)}</li>)
          )}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SidebarProjects({
  chats,
  onCreateProject,
  onDeleteProject,
  onNewChatInProject,
  onRenameProject,
  projects,
  renderChatRow,
}: {
  readonly chats: readonly ChatSummary[];
  readonly onCreateProject?: () => void;
  readonly onDeleteProject?: (projectId: string) => void;
  readonly onNewChatInProject?: (projectId: string) => void;
  readonly onRenameProject?: (project: ChatProject) => void;
  readonly projects: readonly ChatProject[];
  readonly renderChatRow: (chat: ChatSummary) => ReactNode;
}) {
  return (
    <div className="border-border/50 flex shrink-0 flex-col border-t px-2 pt-1.5 pb-1">
      <div className="flex h-7 items-center gap-1">
        <span className="text-muted-foreground min-w-0 flex-1 truncate px-1.5 text-xs font-medium">
          Projects
        </span>
        {onCreateProject ? (
          <IconTooltip label="New project" side="bottom">
            <Button
              aria-label="New project"
              className="text-muted-foreground/55 hover:text-foreground size-6"
              onClick={onCreateProject}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <PlusIcon className="size-3.5" />
            </Button>
          </IconTooltip>
        ) : null}
      </div>
      {projects.length === 0 ? (
        <p className="text-muted-foreground/65 px-1.5 py-1 text-[11px] leading-relaxed">
          Group chats into projects from a chat’s menu, or create one here.
        </p>
      ) : (
        <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
          {projects.map((project) => (
            <ProjectSection
              chats={chats.filter((chat) => chat.projectId === project.id)}
              key={project.id}
              onDeleteProject={onDeleteProject}
              onNewChatInProject={onNewChatInProject}
              onRenameProject={onRenameProject}
              project={project}
              renderChatRow={renderChatRow}
            />
          ))}
        </div>
      )}
    </div>
  );
}
