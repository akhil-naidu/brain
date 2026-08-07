"use client";

import { Building2Icon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { WORKSPACES_CHANGED_EVENT, notifyWorkspacesChanged } from "@/lib/auth/workspace-events";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type WorkspaceListItem = {
  readonly id: string;
  readonly name: string;
  readonly kind: "personal" | "team";
  readonly role: string;
};

function isWorkspaceListItem(value: unknown): value is WorkspaceListItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("id" in value) || !("name" in value) || !("kind" in value) || !("role" in value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.kind === "personal" || value.kind === "team") &&
    typeof value.role === "string"
  );
}

function workspaceLabel(workspace: WorkspaceListItem): string {
  return workspace.kind === "personal" ? "Personal" : workspace.name;
}

function workspaceInitial(workspace: WorkspaceListItem): string {
  const label = workspaceLabel(workspace);
  return label.slice(0, 1).toUpperCase() || "W";
}

export function WorkspaceSwitcher({
  className,
  compact = false,
}: {
  readonly className?: string;
  readonly compact?: boolean;
}) {
  const [workspaces, setWorkspaces] = useState<readonly WorkspaceListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/workspaces");
      if (!response.ok) {
        return;
      }
      const data: unknown = await response.json();
      if (
        typeof data === "object" &&
        data !== null &&
        "workspaces" in data &&
        Array.isArray(data.workspaces)
      ) {
        setWorkspaces(data.workspaces.filter(isWorkspaceListItem));
      }
      if (
        typeof data === "object" &&
        data !== null &&
        "activeWorkspaceId" in data &&
        typeof data.activeWorkspaceId === "string"
      ) {
        setActiveId(data.activeWorkspaceId);
      }
      if (typeof data === "object" && data !== null) {
        setCanCreate("canCreateWorkspace" in data && Boolean(data.canCreateWorkspace));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const onChanged = () => {
      void refresh();
    };
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener(WORKSPACES_CHANGED_EVENT, onChanged);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener(WORKSPACES_CHANGED_EVENT, onChanged);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  async function onSwitch(workspaceId: string) {
    if (workspaceId === activeId || pending) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces/active", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (!response.ok) {
        setError("Unable to switch workspace.");
        setPending(false);
        return;
      }
      setActiveId(workspaceId);
      setPending(false);
      notifyWorkspacesChanged();
      window.location.assign("/chat");
    } catch {
      setPending(false);
      setError("Unable to switch workspace.");
    }
  }

  async function onCreate() {
    const name = newName.trim();
    if (!name || pending) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        setError("Unable to create workspace.");
        setPending(false);
        return;
      }
      setCreateOpen(false);
      setNewName("");
      setPending(false);
      notifyWorkspacesChanged();
      window.location.assign("/chat");
    } catch {
      setPending(false);
      setError("Unable to create workspace.");
    }
  }

  const active = workspaces.find((workspace) => workspace.id === activeId);
  const label = active ? workspaceLabel(active) : "Workspace";

  return (
    <div className={cn("min-w-0", compact ? "flex justify-center" : "w-full", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {compact ? (
            <Button
              aria-label={label}
              className="text-muted-foreground hover:text-foreground size-9"
              disabled={pending || workspaces.length === 0}
              size="icon-sm"
              title={label}
              type="button"
              variant="ghost"
            >
              {active ? (
                <span className="bg-muted text-foreground flex size-6 items-center justify-center rounded-md text-[11px] font-semibold">
                  {workspaceInitial(active)}
                </span>
              ) : (
                <Building2Icon className="size-4" />
              )}
            </Button>
          ) : (
            <button
              className={cn(
                "border-border/70 bg-muted/30 hover:bg-muted/55 focus-visible:ring-ring/40 flex h-8 w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-md border px-1.5 text-left outline-none focus-visible:ring-2",
                (pending || workspaces.length === 0) && "pointer-events-none opacity-50",
              )}
              disabled={pending || workspaces.length === 0}
              title={label}
              type="button"
            >
              <span className="bg-background text-foreground flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold">
                {active ? workspaceInitial(active) : "W"}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{label}</span>
              <ChevronsUpDownIcon className="text-muted-foreground size-3 shrink-0" />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={compact ? "center" : "start"} className="w-60">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              disabled={pending || workspace.id === activeId}
              key={workspace.id}
              onSelect={() => {
                void onSwitch(workspace.id);
              }}
            >
              <span className="bg-muted flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold">
                {workspaceInitial(workspace)}
              </span>
              <span className="min-w-0 flex-1 truncate">{workspaceLabel(workspace)}</span>
              {workspace.id === activeId ? (
                <span className="text-muted-foreground text-xs">Active</span>
              ) : null}
            </DropdownMenuItem>
          ))}
          {canCreate ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={pending}
                onSelect={() => {
                  setError(null);
                  setNewName("");
                  setCreateOpen(true);
                }}
              >
                <PlusIcon className="size-4" />
                New workspace
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && !compact ? <p className="text-destructive mt-1 text-xs">{error}</p> : null}

      <Dialog
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setNewName("");
            setError(null);
          }
        }}
        open={createOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>
              Create a team workspace. You will be the owner and it becomes your active workspace.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="workspace-name">Name</FieldLabel>
            <Input
              id="workspace-name"
              maxLength={80}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void onCreate();
                }
              }}
              placeholder="Acme team"
              value={newName}
            />
          </Field>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() => setCreateOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={pending || !newName.trim()}
              onClick={() => {
                void onCreate();
              }}
              type="button"
            >
              {pending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
