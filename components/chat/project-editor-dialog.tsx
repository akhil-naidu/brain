"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ChatProject } from "@/lib/chat/store/types";

const MAX_PROJECT_NAME_CHARS = 120;

export function ProjectEditorDialog({
  open,
  project,
  onOpenChange,
  onSave,
}: {
  readonly open: boolean;
  readonly project: ChatProject | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (input: { readonly name: string }) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(project?.name ?? "");
    setError(null);
    setSaving(false);
    queueMicrotask(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
  }, [open, project]);

  const canSave = name.trim().length > 0 && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{project ? "Rename project" : "New project"}</DialogTitle>
          <DialogDescription>
            {project
              ? "Update the project name. Chats already in it stay assigned."
              : "Group related chats under a named project in the sidebar."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSave) {
              return;
            }
            setSaving(true);
            setError(null);
            void (async () => {
              try {
                await onSave({ name: name.trim() });
                onOpenChange(false);
              } catch (cause: unknown) {
                setError(cause instanceof Error ? cause.message : "Unable to save project.");
              } finally {
                setSaving(false);
              }
            })();
          }}
        >
          <Field>
            <FieldLabel htmlFor="project-name">Name</FieldLabel>
            <Input
              autoComplete="off"
              id="project-name"
              maxLength={MAX_PROJECT_NAME_CHARS}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Q3 planning"
              ref={nameInputRef}
              value={name}
            />
          </Field>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              disabled={saving}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={!canSave} type="submit">
              {project ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
