"use client";

import { Building2Icon, PlusIcon, Settings2Icon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SettingsRowsSkeleton } from "@/components/loading/skeletons";
import { SettingsBadge, SettingsPanel, SettingsShell } from "@/components/settings/settings-shell";
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
import { WORKSPACES_CHANGED_EVENT, notifyWorkspacesChanged } from "@/lib/auth/workspace-events";
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
  return workspaceLabel(workspace).slice(0, 1).toUpperCase() || "W";
}

function roleLabel(role: string): string {
  if (role === "owner" || role === "admin" || role === "member") {
    return role;
  }
  return role;
}

export function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<readonly WorkspaceListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/workspaces");
      if (!response.ok) {
        throw new Error("Unable to load workspaces.");
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
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load workspaces.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onChanged = () => {
      void refresh();
    };
    window.addEventListener(WORKSPACES_CHANGED_EVENT, onChanged);
    window.addEventListener("focus", onChanged);
    return () => {
      window.removeEventListener(WORKSPACES_CHANGED_EVENT, onChanged);
      window.removeEventListener("focus", onChanged);
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
      window.location.assign("/workspaces");
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
      window.location.assign("/workspaces");
    } catch {
      setPending(false);
      setError("Unable to create workspace.");
    }
  }

  return (
    <SettingsShell
      description="Switch between workspaces you belong to, create a team space, or open settings."
      meta={
        canCreate ? (
          <Button
            disabled={pending}
            onClick={() => {
              setError(null);
              setNewName("");
              setCreateOpen(true);
            }}
            size="sm"
            type="button"
          >
            <PlusIcon className="size-3.5" />
            New workspace
          </Button>
        ) : null
      }
      title="Workspaces"
    >
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <SettingsPanel>
        {loading ? (
          <SettingsRowsSkeleton rows={3} />
        ) : workspaces.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            No workspaces found.
          </p>
        ) : (
          <ul className="divide-border/70 divide-y">
            {workspaces.map((workspace) => {
              const active = workspace.id === activeId;
              const label = workspaceLabel(workspace);
              return (
                <li
                  className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  key={workspace.id}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold">
                      {workspaceInitial(workspace)}
                    </span>
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{label}</p>
                        {active ? <SettingsBadge>Active</SettingsBadge> : null}
                        <SettingsBadge>
                          {workspace.kind === "personal" ? "Personal" : "Team"}
                        </SettingsBadge>
                        <SettingsBadge>{roleLabel(workspace.role)}</SettingsBadge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {workspace.kind === "personal"
                          ? "Your private workspace."
                          : "Shared team workspace."}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {active ? (
                      <Button asChild size="sm" type="button" variant="outline">
                        <Link href="/settings/workspace">
                          <Settings2Icon className="size-3.5" />
                          Settings
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        disabled={pending}
                        onClick={() => {
                          void onSwitch(workspace.id);
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Building2Icon className="size-3.5" />
                        Switch
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SettingsPanel>

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
            <FieldLabel htmlFor="workspaces-page-name">Name</FieldLabel>
            <Input
              id="workspaces-page-name"
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
            <p className={cn("text-destructive text-sm")} role="alert">
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
    </SettingsShell>
  );
}
