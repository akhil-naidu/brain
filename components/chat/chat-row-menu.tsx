"use client";

import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  FolderIcon,
  FolderPlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PinIcon,
  ShareIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatProject } from "@/lib/chat/store/types";
import { cn } from "@/lib/utils";

export function ChatRowMenu({
  canShare,
  chatTitle,
  onArchive,
  onCreateProject,
  onDelete,
  onMoveToProject,
  onPin,
  onRename,
  onShare,
  onUnarchive,
  pinned,
  projectId,
  projects,
  selected = false,
  triggerVisible = "hover",
}: {
  readonly canShare: boolean;
  readonly chatTitle: string;
  readonly onArchive?: () => void;
  readonly onCreateProject?: () => void;
  readonly onDelete: () => void;
  readonly onMoveToProject?: (projectId: string | null) => void;
  readonly onPin?: () => void;
  readonly onRename?: () => void;
  readonly onShare?: () => void;
  readonly onUnarchive?: () => void;
  readonly pinned: boolean;
  readonly projectId: string | null;
  readonly projects: readonly ChatProject[];
  readonly selected?: boolean;
  /** hover: fade in on row hover (sidebar). always: keep the trigger visible. */
  readonly triggerVisible?: "hover" | "always";
}) {
  const [open, setOpen] = useState(false);
  const canMove = Boolean(onMoveToProject || onCreateProject);

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Chat actions for ${chatTitle}`}
          className={cn(
            "text-muted-foreground/55 hover:text-foreground size-6 shrink-0 transition-opacity",
            triggerVisible === "always" || open || selected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreHorizontalIcon className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-border bg-popover w-48 rounded-md p-1"
        collisionPadding={12}
        sideOffset={4}
      >
        {canShare && onShare ? (
          <DropdownMenuItem
            className="gap-2"
            onSelect={() => {
              onShare();
            }}
          >
            <ShareIcon className="size-4" />
            Share
          </DropdownMenuItem>
        ) : null}
        {onRename ? (
          <DropdownMenuItem
            className="gap-2"
            onSelect={() => {
              onRename();
            }}
          >
            <PencilIcon className="size-4" />
            Rename
          </DropdownMenuItem>
        ) : null}
        {onPin ? (
          <DropdownMenuItem
            className="gap-2"
            onSelect={() => {
              onPin();
            }}
          >
            <PinIcon className="size-4" />
            {pinned ? "Unpin chat" : "Pin chat"}
          </DropdownMenuItem>
        ) : null}
        {onArchive ? (
          <DropdownMenuItem
            className="gap-2"
            onSelect={() => {
              onArchive();
            }}
          >
            <ArchiveIcon className="size-4" />
            Archive
          </DropdownMenuItem>
        ) : null}
        {onUnarchive ? (
          <DropdownMenuItem
            className="gap-2"
            onSelect={() => {
              onUnarchive();
            }}
          >
            <ArchiveRestoreIcon className="size-4" />
            Unarchive
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          className="gap-2"
          onSelect={() => {
            onDelete();
          }}
          variant="destructive"
        >
          <Trash2Icon className="size-4" />
          Delete
        </DropdownMenuItem>
        {canMove ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <FolderIcon className="size-4" />
                Move to project
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="border-border bg-popover w-48 rounded-md p-1">
                {projectId && onMoveToProject ? (
                  <DropdownMenuItem
                    className="gap-2"
                    onSelect={() => {
                      onMoveToProject(null);
                    }}
                  >
                    Remove from project
                  </DropdownMenuItem>
                ) : null}
                {projects.map((project) => (
                  <DropdownMenuItem
                    className="gap-2"
                    disabled={project.id === projectId}
                    key={project.id}
                    onSelect={() => {
                      onMoveToProject?.(project.id);
                    }}
                  >
                    <FolderIcon className="size-4" />
                    <span className="truncate">{project.name}</span>
                  </DropdownMenuItem>
                ))}
                {onCreateProject ? (
                  <>
                    {projects.length > 0 || projectId ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuItem
                      className="gap-2"
                      onSelect={() => {
                        onCreateProject();
                      }}
                    >
                      <FolderPlusIcon className="size-4" />
                      New project
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
