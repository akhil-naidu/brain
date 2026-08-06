"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
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

export function WorkspaceSwitcher({
  className,
  compact = false,
}: {
  readonly className?: string;
  readonly compact?: boolean;
}) {
  const selectId = useId();
  const [workspaces, setWorkspaces] = useState<readonly WorkspaceListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void refresh();
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
      window.location.assign("/chat");
    } catch {
      setPending(false);
      setError("Unable to switch workspace.");
    }
  }

  async function onCreate() {
    const name = window.prompt("Workspace name");
    if (!name?.trim()) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!response.ok) {
        setError("Unable to create workspace.");
        setPending(false);
        return;
      }
      setPending(false);
      window.location.assign("/chat");
    } catch {
      setPending(false);
      setError("Unable to create workspace.");
    }
  }

  const active = workspaces.find((workspace) => workspace.id === activeId);

  if (compact) {
    return (
      <button
        className={cn(
          "text-muted-foreground hover:text-foreground truncate text-left text-xs",
          className,
        )}
        onClick={() => {
          void onCreate();
        }}
        title={active?.name ?? "Workspace"}
        type="button"
      >
        {active?.kind === "personal" ? "Personal" : (active?.name ?? "WS")}
      </button>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <label
        className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase"
        htmlFor={selectId}
      >
        Workspace
      </label>
      <select
        className="border-border bg-background w-full rounded-md border px-2 py-1.5 text-sm"
        disabled={pending || workspaces.length === 0}
        id={selectId}
        onChange={(event) => {
          void onSwitch(event.target.value);
        }}
        value={activeId ?? ""}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.kind === "personal" ? "Personal" : workspace.name}
          </option>
        ))}
      </select>
      <Button
        className="h-7 w-full text-xs"
        disabled={pending}
        onClick={() => {
          void onCreate();
        }}
        size="sm"
        type="button"
        variant="ghost"
      >
        New workspace
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
