"use client";

import { GitBranchIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  buildAttachedRepo,
  formatAttachedRepo,
  formatAttachedRepoInput,
  parseAttachedRepo,
  type AttachedRepo,
} from "@/lib/chat/attached-repo";
import { fetchConnectionStatuses, type ConnectionStatus } from "@/lib/chat/connections-status-api";
import { cn } from "@/lib/utils";

type DraftFields = {
  readonly paste: string;
  readonly owner: string;
  readonly name: string;
  readonly ref: string;
};

const EMPTY_DRAFT: DraftFields = {
  paste: "",
  owner: "",
  name: "",
  ref: "",
};

function draftFromRepo(repo: AttachedRepo | null): DraftFields {
  if (!repo) {
    return EMPTY_DRAFT;
  }
  return {
    paste: formatAttachedRepoInput(repo),
    owner: repo.owner,
    name: repo.name,
    ref: repo.ref ?? "",
  };
}

function draftFromPaste(paste: string): DraftFields {
  const parsed = parseAttachedRepo(paste);
  if (!parsed) {
    return { paste, owner: "", name: "", ref: "" };
  }
  return {
    paste,
    owner: parsed.owner,
    name: parsed.name,
    ref: parsed.ref ?? "",
  };
}

function draftFromFields(fields: Omit<DraftFields, "paste">): DraftFields {
  const built = buildAttachedRepo(fields);
  return {
    paste: built ? formatAttachedRepoInput(built) : "",
    owner: fields.owner,
    name: fields.name,
    ref: fields.ref,
  };
}

function resolveDraftRepo(draft: DraftFields): AttachedRepo | null {
  return (
    buildAttachedRepo({
      owner: draft.owner,
      name: draft.name,
      ref: draft.ref,
    }) ?? parseAttachedRepo(draft.paste)
  );
}

export function AttachedRepoControl({
  disabled = false,
  onChange,
  repo,
}: {
  readonly disabled?: boolean;
  readonly onChange: (repo: AttachedRepo | null) => void;
  readonly repo: AttachedRepo | null;
}) {
  const pasteId = useId();
  const ownerId = useId();
  const nameId = useId();
  const refId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftFields>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [githubStatus, setGithubStatus] = useState<ConnectionStatus | null | undefined>(undefined);

  const label = repo ? formatAttachedRepo(repo) : "Repo";
  const canAttach = resolveDraftRepo(draft) !== null;

  useEffect(() => {
    if (!open) {
      return () => {};
    }
    let cancelled = false;
    setGithubStatus(undefined);
    void (async () => {
      try {
        const statuses = await fetchConnectionStatuses();
        if (cancelled) {
          return;
        }
        setGithubStatus(statuses.find((item) => item.id === "github") ?? null);
      } catch {
        if (!cancelled) {
          setGithubStatus(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setDraft(draftFromRepo(repo));
      setError(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = resolveDraftRepo(draft);
    if (!parsed) {
      setError("Enter a GitHub URL or owner, repo, and optional branch.");
      return;
    }
    onChange(parsed);
    setOpen(false);
  }

  const githubConnected = githubStatus?.status === "connected";

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <button
          aria-label={repo ? `Attached repository ${label}` : "Attach GitHub repository"}
          className={cn(
            "text-muted-foreground/65 hover:bg-background/45 hover:text-foreground inline-flex h-8 max-w-44 shrink-0 items-center gap-1 rounded-full px-2 text-xs transition-colors disabled:pointer-events-none disabled:opacity-50",
            repo && "text-foreground bg-background/35",
          )}
          disabled={disabled}
          title={repo ? `Attached ${label}` : "Attach GitHub repo"}
          type="button"
        >
          <GitBranchIcon className="size-3.5 shrink-0" />
          <span className="truncate">{label}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Attach repository</DialogTitle>
            <DialogDescription>
              Pick one GitHub repo for this chat. Agent mode clones it into a temporary sandbox at{" "}
              <span className="font-mono">/workspace</span> — not onto your Brain server disk.
            </DialogDescription>
          </DialogHeader>

          <output
            className={cn(
              "block rounded-lg border px-3 py-2 text-xs leading-snug",
              githubConnected
                ? "border-border/70 bg-muted/30 text-muted-foreground"
                : "text-foreground border-amber-500/30 bg-amber-500/5",
            )}
          >
            {githubStatus === undefined ? (
              <p>Checking GitHub connection…</p>
            ) : githubConnected ? (
              <p>
                GitHub is connected. Private repos can be cloned, and GitHub tools (PRs, issues)
                stay available in Tools.
              </p>
            ) : (
              <p>
                Connect GitHub in{" "}
                <Link
                  className="text-foreground font-medium underline underline-offset-2"
                  href="/tools?focus=github"
                  onClick={() => setOpen(false)}
                >
                  Tools
                </Link>{" "}
                for private repos (and PRs/issues). Public repos can still be attached without it.
              </p>
            )}
          </output>

          <Field>
            <FieldLabel htmlFor={pasteId}>Paste URL or owner/repo</FieldLabel>
            <Input
              disabled={disabled}
              id={pasteId}
              onChange={(event) => {
                setDraft(draftFromPaste(event.target.value));
                if (error) {
                  setError(null);
                }
              }}
              placeholder="https://github.com/owner/repo/tree/branch"
              value={draft.paste}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={ownerId}>Owner</FieldLabel>
              <Input
                disabled={disabled}
                id={ownerId}
                onChange={(event) => {
                  setDraft(
                    draftFromFields({
                      owner: event.target.value,
                      name: draft.name,
                      ref: draft.ref,
                    }),
                  );
                  if (error) {
                    setError(null);
                  }
                }}
                placeholder="acme"
                value={draft.owner}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={nameId}>Repo</FieldLabel>
              <Input
                disabled={disabled}
                id={nameId}
                onChange={(event) => {
                  setDraft(
                    draftFromFields({
                      owner: draft.owner,
                      name: event.target.value,
                      ref: draft.ref,
                    }),
                  );
                  if (error) {
                    setError(null);
                  }
                }}
                placeholder="api"
                value={draft.name}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor={refId}>Branch or tag (optional)</FieldLabel>
            <Input
              disabled={disabled}
              id={refId}
              onChange={(event) => {
                setDraft(
                  draftFromFields({
                    owner: draft.owner,
                    name: draft.name,
                    ref: event.target.value,
                  }),
                );
                if (error) {
                  setError(null);
                }
              }}
              placeholder="main"
              value={draft.ref}
            />
          </Field>

          {error ? (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            {repo ? (
              <Button
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                type="button"
                variant="ghost"
              >
                Clear
              </Button>
            ) : null}
            <Button disabled={disabled || !canAttach} type="submit">
              Attach
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
