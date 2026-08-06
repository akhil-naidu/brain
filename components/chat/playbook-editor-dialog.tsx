"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  MAX_PLAYBOOK_LABEL_CHARS,
  MAX_PLAYBOOK_PROMPT_CHARS,
  type Playbook,
} from "@/lib/chat/playbooks";

export function PlaybookEditorDialog({
  open,
  playbook,
  onOpenChange,
  onSave,
}: {
  readonly open: boolean;
  readonly playbook: Playbook | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (input: {
    readonly id?: string;
    readonly label: string;
    readonly prompt: string;
  }) => void | Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setLabel(playbook?.label ?? "");
    setPrompt(playbook?.prompt ?? "");
    setError(null);
  }, [open, playbook]);

  const canSave = label.trim().length > 0 && prompt.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{playbook ? "Edit playbook" : "New playbook"}</DialogTitle>
          <DialogDescription>
            Save a named prompt you can run anytime from chat. It stays in this browser.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm font-medium" htmlFor="playbook-label">
              Name
            </label>
            <Input
              autoComplete="off"
              id="playbook-label"
              maxLength={MAX_PLAYBOOK_LABEL_CHARS}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="e.g. Triage inbox"
              value={label}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-sm font-medium" htmlFor="playbook-prompt">
              Prompt
            </label>
            <textarea
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-28 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
              id="playbook-prompt"
              maxLength={MAX_PLAYBOOK_PROMPT_CHARS}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="What should Brain do when you run this?"
              value={prompt}
            />
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button
            disabled={!canSave}
            onClick={() => {
              void (async () => {
                try {
                  await onSave({
                    id: playbook?.id,
                    label,
                    prompt,
                  });
                  onOpenChange(false);
                } catch (saveError) {
                  setError(saveError instanceof Error ? saveError.message : "Unable to save.");
                }
              })();
            }}
            type="button"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
