"use client";

import { ChevronsUpDownIcon, PlusIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
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
  const [isInstanceAdmin, setIsInstanceAdmin] = useState(false);
  const [activeRole, setActiveRole] = useState<string | null>(null);
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
        setIsInstanceAdmin("isInstanceAdmin" in data && Boolean(data.isInstanceAdmin));
        setActiveRole(
          "activeRole" in data && typeof data.activeRole === "string" ? data.activeRole : null,
        );
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
  const canManageInvites = activeRole === "owner" || activeRole === "admin";

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={
            compact
              ? "text-muted-foreground hover:text-foreground h-auto max-w-[3.25rem] truncate px-1 py-0.5 text-[10px] font-medium"
              : "border-border bg-background h-auto w-full justify-between gap-2 px-2 py-1.5 text-left text-sm font-normal"
          }
          disabled={pending || workspaces.length === 0}
          size={compact ? "sm" : "default"}
          title={active ? workspaceLabel(active) : "Workspace"}
          type="button"
          variant={compact ? "ghost" : "outline"}
        >
          <span className="truncate">
            {active
              ? compact
                ? active.kind === "personal"
                  ? "Personal"
                  : active.name
                : workspaceLabel(active)
              : "Workspace"}
          </span>
          {compact ? null : (
            <ChevronsUpDownIcon className="text-muted-foreground size-3.5 shrink-0" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "center" : "start"} className="w-56">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            disabled={pending || workspace.id === activeId}
            key={workspace.id}
            onSelect={() => {
              void onSwitch(workspace.id);
            }}
          >
            <span className="truncate">{workspaceLabel(workspace)}</span>
            {workspace.id === activeId ? (
              <span className="text-muted-foreground ml-auto text-xs">Active</span>
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
        {canManageInvites || isInstanceAdmin ? (
          <>
            <DropdownMenuSeparator />
            {canManageInvites ? (
              <DropdownMenuItem asChild>
                <Link href="/settings/workspace">
                  <SettingsIcon className="size-4" />
                  Workspace settings
                </Link>
              </DropdownMenuItem>
            ) : null}
            {isInstanceAdmin ? (
              <DropdownMenuItem asChild>
                <Link href="/settings/instance">
                  <SettingsIcon className="size-4" />
                  Instance settings
                </Link>
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className={cn(compact ? undefined : "space-y-1", className)}>
      {compact ? null : (
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          Workspace
        </p>
      )}
      {menu}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}

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
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="workspace-name">
              Name
            </label>
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
          </div>
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
