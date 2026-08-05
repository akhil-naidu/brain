"use client";

import Link from "next/link";
import {
  BookmarkIcon,
  CalendarClockIcon,
  PencilIcon,
  PlusIcon,
  Settings2Icon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { PlaybookEditorDialog } from "@/components/chat/playbook-editor-dialog";
import { SchedulePlaybookDialog } from "@/components/chat/schedule-playbook-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MAX_PLAYBOOKS, type Playbook } from "@/lib/chat/playbooks";
import { listScheduledPlaybooks } from "@/lib/chat/scheduled-playbooks-api";
import { cn } from "@/lib/utils";

export function PlaybooksMenu({
  disabled = false,
  playbooks,
  onDelete,
  onRun,
  onSave,
  onScheduled,
}: {
  readonly disabled?: boolean;
  readonly playbooks: readonly Playbook[];
  readonly onDelete: (id: string) => void;
  readonly onRun: (prompt: string) => void;
  readonly onSave: (input: {
    readonly id?: string;
    readonly label: string;
    readonly prompt: string;
  }) => void;
  readonly onScheduled?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editing, setEditing] = useState<Playbook | null>(null);
  const [scheduling, setScheduling] = useState<Playbook | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const atLimit = playbooks.length >= MAX_PLAYBOOKS;

  return (
    <>
      <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Playbooks"
            className={cn(
              "text-muted-foreground/75 hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground dark:text-muted-foreground/60 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
            )}
            disabled={disabled}
            title="Playbooks"
            type="button"
          >
            <BookmarkIcon className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="border-border bg-popover w-[min(18rem,calc(100vw-1.5rem))] rounded-md p-1"
          collisionPadding={12}
          sideOffset={4}
        >
          {playbooks.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-xs leading-relaxed">
              No playbooks yet. Save a prompt you reuse often.
            </p>
          ) : (
            playbooks.map((item) => (
              <DropdownMenuItem
                className="focus:bg-muted/70 h-auto cursor-pointer gap-2 rounded-sm px-2 py-1.5"
                key={item.id}
                onSelect={(event) => {
                  event.preventDefault();
                  const target = event.target;
                  if (
                    target instanceof Element &&
                    target.closest(
                      "[data-playbook-edit], [data-playbook-delete], [data-playbook-schedule]",
                    )
                  ) {
                    return;
                  }
                  setMenuOpen(false);
                  onRun(item.prompt);
                }}
              >
                <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                {onScheduled ? (
                  <button
                    aria-label={`Schedule ${item.label}`}
                    className="text-muted-foreground hover:text-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-md"
                    data-playbook-schedule
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void (async () => {
                        setScheduleError(null);
                        try {
                          const listed = await listScheduledPlaybooks();
                          const existing = listed.find(
                            (schedule) => schedule.sourcePlaybookId === item.id,
                          );
                          if (existing) {
                            setMenuOpen(false);
                            onScheduled();
                            return;
                          }
                          setMenuOpen(false);
                          setScheduling(item);
                          setScheduleOpen(true);
                        } catch (error) {
                          setScheduleError(
                            error instanceof Error ? error.message : "Unable to schedule playbook.",
                          );
                        }
                      })();
                    }}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    title="Schedule"
                    type="button"
                  >
                    <CalendarClockIcon className="size-3.5" />
                  </button>
                ) : null}
                <button
                  aria-label={`Edit ${item.label}`}
                  className="text-muted-foreground hover:text-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-md"
                  data-playbook-edit
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setMenuOpen(false);
                    setEditing(item);
                    setEditorOpen(true);
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  type="button"
                >
                  <PencilIcon className="size-3.5" />
                </button>
                <button
                  aria-label={`Delete ${item.label}`}
                  className="text-muted-foreground hover:text-destructive inline-flex size-6 shrink-0 items-center justify-center rounded-md"
                  data-playbook-delete
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDelete(item.id);
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  type="button"
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              </DropdownMenuItem>
            ))
          )}
          {scheduleError ? (
            <p className="text-destructive px-2 py-1 text-xs leading-relaxed">{scheduleError}</p>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            disabled={atLimit}
            onSelect={(event) => {
              event.preventDefault();
              setMenuOpen(false);
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <PlusIcon className="size-3.5" />
            New playbook
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer gap-2">
            <Link href="/playbooks" onClick={() => setMenuOpen(false)}>
              <Settings2Icon className="size-3.5" />
              Manage
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PlaybookEditorDialog
        onOpenChange={setEditorOpen}
        onSave={onSave}
        open={editorOpen}
        playbook={editing}
      />

      {onScheduled ? (
        <SchedulePlaybookDialog
          onOpenChange={setScheduleOpen}
          onScheduled={onScheduled}
          open={scheduleOpen}
          playbook={scheduling}
        />
      ) : null}
    </>
  );
}
