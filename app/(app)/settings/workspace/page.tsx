"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InviteRow = {
  readonly id: string;
  readonly token: string;
  readonly email: string | null;
  readonly role: string;
  readonly expiresAt: string;
};

type WorkspaceListItem = {
  readonly id: string;
  readonly name: string;
  readonly role: string;
};

function isInviteRow(value: unknown): value is InviteRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "token" in value &&
    typeof value.token === "string" &&
    "role" in value &&
    typeof value.role === "string" &&
    "expiresAt" in value &&
    typeof value.expiresAt === "string"
  );
}

function isWorkspaceListItem(value: unknown): value is WorkspaceListItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "role" in value &&
    typeof value.role === "string"
  );
}

function inviteUrl(token: string): string {
  if (typeof window === "undefined") {
    return `/invite/${token}`;
  }
  return `${window.location.origin}/invite/${token}`;
}

export default function WorkspaceSettingsPage() {
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [invites, setInvites] = useState<readonly InviteRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const wsResponse = await fetch("/api/workspaces");
      const wsData: unknown = await wsResponse.json();
      if (
        wsResponse.ok &&
        typeof wsData === "object" &&
        wsData !== null &&
        "workspaces" in wsData &&
        Array.isArray(wsData.workspaces) &&
        "activeWorkspaceId" in wsData &&
        typeof wsData.activeWorkspaceId === "string"
      ) {
        const activeId = wsData.activeWorkspaceId;
        const active = wsData.workspaces
          .filter(isWorkspaceListItem)
          .find((item) => item.id === activeId);
        if (active) {
          setWorkspaceName(active.name);
        }
        const roleValue = active?.role ?? null;
        setCanManage(roleValue === "owner" || roleValue === "admin");
        if (roleValue !== "owner" && roleValue !== "admin") {
          setInvites([]);
          return;
        }
      }

      const response = await fetch("/api/workspaces/invites");
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to load invites.",
        );
        return;
      }
      if (
        typeof data === "object" &&
        data !== null &&
        "invites" in data &&
        Array.isArray(data.invites)
      ) {
        setInvites(data.invites.filter(isInviteRow));
      }
    } catch {
      setError("Unable to load workspace settings.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onCreate() {
    setPending(true);
    setError(null);
    setCreatedUrl(null);
    try {
      const response = await fetch("/api/workspaces/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || undefined,
          role,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to create invite.",
        );
        setPending(false);
        return;
      }
      if (
        typeof data === "object" &&
        data !== null &&
        "invite" in data &&
        isInviteRow(data.invite)
      ) {
        const url = inviteUrl(data.invite.token);
        setCreatedUrl(url);
        try {
          await navigator.clipboard.writeText(url);
          setCopiedId(data.invite.id);
        } catch {
          // ignore clipboard failures
        }
      }
      setEmail("");
      setPending(false);
      await refresh();
    } catch {
      setPending(false);
      setError("Unable to create invite.");
    }
  }

  async function onRevoke(inviteId: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/invites/${inviteId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data: unknown = await response.json();
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to revoke invite.",
        );
        setPending(false);
        return;
      }
      setPending(false);
      await refresh();
    } catch {
      setPending(false);
      setError("Unable to revoke invite.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Workspace settings</h1>
        <p className="text-muted-foreground text-sm">
          {workspaceName
            ? `Invites for ${workspaceName}. Share a link — no email delivery in this version.`
            : "Manage invites for the active workspace."}
        </p>
      </div>

      {!canManage ? (
        <p className="text-muted-foreground text-sm">
          Only workspace owners and admins can create or revoke invites.
        </p>
      ) : (
        <div className="border-border space-y-3 rounded-xl border p-4">
          <p className="text-sm font-medium">Create invite</p>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="invite-email">
              Email (optional)
            </label>
            <Input
              id="invite-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="person@example.com"
              type="email"
              value={email}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="invite-role">
              Role
            </label>
            <select
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
              id="invite-role"
              onChange={(event) => {
                if (event.target.value === "admin" || event.target.value === "member") {
                  setRole(event.target.value);
                }
              }}
              value={role}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button
            disabled={pending}
            onClick={() => {
              void onCreate();
            }}
            type="button"
          >
            {pending ? "Creating…" : "Create invite link"}
          </Button>
          {createdUrl ? (
            <div className="bg-muted/40 space-y-1 rounded-md p-3">
              <p className="text-xs font-medium">Invite link</p>
              <p className="font-mono text-xs break-all">{createdUrl}</p>
              <p className="text-muted-foreground text-xs">
                {copiedId ? "Copied to clipboard." : "Copy and share this link."}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Outstanding invites</h2>
        {invites.length === 0 ? (
          <p className="text-muted-foreground text-sm">No active invites.</p>
        ) : (
          <ul className="space-y-2">
            {invites.map((invite) => (
              <li
                className="border-border flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                key={invite.id}
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium">
                    {invite.email ?? "Anyone with the link"} · {invite.role}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Expires {new Date(invite.expiresAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    disabled={pending}
                    onClick={() => {
                      void (async () => {
                        try {
                          await navigator.clipboard.writeText(inviteUrl(invite.token));
                          setCopiedId(invite.id);
                        } catch {
                          setCreatedUrl(inviteUrl(invite.token));
                        }
                      })();
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {copiedId === invite.id ? "Copied" : "Copy link"}
                  </Button>
                  {canManage ? (
                    <Button
                      disabled={pending}
                      onClick={() => {
                        void onRevoke(invite.id);
                      }}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Revoke
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
