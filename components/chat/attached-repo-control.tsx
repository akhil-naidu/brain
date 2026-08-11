"use client";

import { GitBranchIcon } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatAttachedRepo, parseAttachedRepo, type AttachedRepo } from "@/lib/chat/attached-repo";
import { cn } from "@/lib/utils";

export function AttachedRepoControl({
  disabled = false,
  onChange,
  repo,
}: {
  readonly disabled?: boolean;
  readonly onChange: (repo: AttachedRepo | null) => void;
  readonly repo: AttachedRepo | null;
}) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const label = repo ? formatAttachedRepo(repo) : "Repo";

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setDraft(repo ? formatAttachedRepo(repo) : "");
      setError(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseAttachedRepo(draft);
    if (!parsed) {
      setError("Use owner/repo, owner/repo@branch, or a github.com URL.");
      return;
    }
    onChange(parsed);
    setOpen(false);
  }

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
          <label className="text-foreground text-xs font-medium" htmlFor={inputId}>
            GitHub repository
          </label>
          <Input
            disabled={disabled}
            id={inputId}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            placeholder="owner/repo or github.com URL"
            value={draft}
          />
          <p className="text-muted-foreground text-[11px] leading-snug">
            Optional branch: <span className="font-mono">owner/repo@main</span>. Clones into the
            Agent sandbox at <span className="font-mono">/workspace</span>.
          </p>
          {error ? <p className="text-destructive text-[11px]">{error}</p> : null}
          <div className="flex justify-end gap-1.5 pt-1">
            {repo ? (
              <Button
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                Clear
              </Button>
            ) : null}
            <Button disabled={disabled || draft.trim().length === 0} size="sm" type="submit">
              Attach
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
