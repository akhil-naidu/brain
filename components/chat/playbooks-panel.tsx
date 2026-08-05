"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { PlaybookEditorDialog } from "@/components/chat/playbook-editor-dialog";
import { Button } from "@/components/ui/button";
import { MAX_PLAYBOOKS, type Playbook } from "@/lib/chat/playbooks";
import { cn } from "@/lib/utils";

export function PlaybooksPanel({
  className,
  playbooks,
  onDelete,
  onRun,
  onSave,
}: {
  readonly className?: string;
  readonly playbooks: readonly Playbook[];
  readonly onDelete: (id: string) => void;
  readonly onRun: (prompt: string) => void;
  readonly onSave: (input: {
    readonly id?: string;
    readonly label: string;
    readonly prompt: string;
  }) => void;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Playbook | null>(null);
  const atLimit = playbooks.length >= MAX_PLAYBOOKS;

  return (
    <div className={cn("mx-auto mt-6 w-full max-w-md text-left", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-muted-foreground/80 text-xs font-medium tracking-wide uppercase">
          Your playbooks
        </p>
        <Button
          className="text-muted-foreground h-7 px-2 text-xs"
          disabled={atLimit}
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
          size="sm"
          title={atLimit ? `You can save up to ${MAX_PLAYBOOKS} playbooks.` : "Add playbook"}
          type="button"
          variant="ghost"
        >
          <PlusIcon className="size-3.5" />
          Add
        </Button>
      </div>

      {playbooks.length === 0 ? (
        <p className="text-muted-foreground px-3 py-2 text-sm leading-relaxed">
          Save prompts you reuse — like “Triage inbox” or “Sprint risks”.
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {playbooks.map((item) => (
            <li className="group flex items-stretch gap-1" key={item.id}>
              <button
                className="text-foreground hover:bg-muted/70 focus-visible:ring-ring/50 min-w-0 flex-1 cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                onClick={() => onRun(item.prompt)}
                type="button"
              >
                {item.label}
              </button>
              <button
                aria-label={`Edit ${item.label}`}
                className="text-muted-foreground hover:bg-muted/70 hover:text-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                onClick={() => {
                  setEditing(item);
                  setEditorOpen(true);
                }}
                type="button"
              >
                <PencilIcon className="size-3.5" />
              </button>
              <button
                aria-label={`Delete ${item.label}`}
                className="text-muted-foreground hover:bg-muted/70 hover:text-destructive inline-flex size-9 shrink-0 items-center justify-center rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                onClick={() => onDelete(item.id)}
                type="button"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <PlaybookEditorDialog
        onOpenChange={setEditorOpen}
        onSave={onSave}
        open={editorOpen}
        playbook={editing}
      />
    </div>
  );
}
