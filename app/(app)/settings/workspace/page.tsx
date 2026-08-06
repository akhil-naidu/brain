"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceByoaSection } from "@/components/chat/workspace-byoa-section";
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
  readonly kind?: string;
};

type MemberRow = {
  readonly userId: string;
  readonly role: "owner" | "admin" | "member";
  readonly email: string | null;
  readonly name: string | null;
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

function isMemberRow(value: unknown): value is MemberRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("userId" in value) || typeof value.userId !== "string") {
    return false;
  }
  if (
    !("role" in value) ||
    (value.role !== "owner" && value.role !== "admin" && value.role !== "member")
  ) {
    return false;
  }
  return true;
}

function inviteUrl(token: string): string {
  if (typeof window === "undefined") {
    return `/invite/${token}`;
  }
  return `${window.location.origin}/invite/${token}`;
}

function memberLabel(member: MemberRow): string {
  return member.email ?? member.name ?? member.userId.slice(0, 8);
}

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [workspaceKind, setWorkspaceKind] = useState<"personal" | "team" | null>(null);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<"owner" | "admin" | "member" | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [members, setMembers] = useState<readonly MemberRow[]>([]);
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
      let manage = false;
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
          setWorkspaceKind(active.kind === "personal" ? "personal" : "team");
        }
        const roleValue = active?.role ?? null;
        setViewerRole(
          roleValue === "owner" || roleValue === "admin" || roleValue === "member"
            ? roleValue
            : null,
        );
        manage = roleValue === "owner" || roleValue === "admin";
        setCanManage(manage);
      }

      const membersResponse = await fetch("/api/workspaces/members");
      const membersData: unknown = await membersResponse.json();
      if (membersResponse.ok && typeof membersData === "object" && membersData !== null) {
        if ("viewerUserId" in membersData && typeof membersData.viewerUserId === "string") {
          setViewerUserId(membersData.viewerUserId);
        }
        if (
          "workspaceKind" in membersData &&
          (membersData.workspaceKind === "personal" || membersData.workspaceKind === "team")
        ) {
          setWorkspaceKind(membersData.workspaceKind);
        }
        if (
          "viewerRole" in membersData &&
          (membersData.viewerRole === "owner" ||
            membersData.viewerRole === "admin" ||
            membersData.viewerRole === "member")
        ) {
          setViewerRole(membersData.viewerRole);
          manage = membersData.viewerRole === "owner" || membersData.viewerRole === "admin";
          setCanManage(manage);
        }
        if ("members" in membersData && Array.isArray(membersData.members)) {
          setMembers(membersData.members.filter(isMemberRow));
        }
      }

      if (manage) {
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
      } else {
        setInvites([]);
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

  async function onChangeRole(userId: string, nextRole: "admin" | "member") {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/members/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to update role.",
        );
        setPending(false);
        return;
      }
      setPending(false);
      await refresh();
    } catch {
      setPending(false);
      setError("Unable to update role.");
    }
  }

  async function onRemove(userId: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/members/${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to remove member.",
        );
        setPending(false);
        return;
      }
      setPending(false);
      if (userId === viewerUserId) {
        router.replace("/chat");
        router.refresh();
        return;
      }
      await refresh();
    } catch {
      setPending(false);
      setError("Unable to remove member.");
    }
  }

  async function onTransfer(userId: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces/transfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to transfer ownership.",
        );
        setPending(false);
        return;
      }
      setPending(false);
      await refresh();
    } catch {
      setPending(false);
      setError("Unable to transfer ownership.");
    }
  }

  const isTeam = workspaceKind === "team";
  const ownerCount = members.filter((member) => member.role === "owner").length;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Workspace settings</h1>
        <p className="text-muted-foreground text-sm">
          {workspaceName
            ? `Members and invites for ${workspaceName}.`
            : "Manage members and invites for the active workspace."}
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Members</h2>
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">No members loaded.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => {
              const isSelf = member.userId === viewerUserId;
              const canEditRole =
                isTeam &&
                canManage &&
                member.role !== "owner" &&
                !(viewerRole === "admin" && member.role === "admin" && !isSelf);
              const canRemove =
                isTeam &&
                (isSelf
                  ? !(member.role === "owner" && ownerCount <= 1)
                  : canManage &&
                    member.role !== "owner" &&
                    !(viewerRole === "admin" && member.role === "admin"));
              const canTransfer =
                isTeam && viewerRole === "owner" && !isSelf && member.role !== "owner";
              return (
                <li
                  className="border-border flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  key={member.userId}
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium">
                      {memberLabel(member)}
                      {isSelf ? " (you)" : ""}
                    </p>
                    <p className="text-muted-foreground text-xs capitalize">{member.role}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {canEditRole ? (
                      <select
                        className="border-border bg-background rounded-md border px-2 py-1 text-xs"
                        disabled={pending}
                        onChange={(event) => {
                          if (event.target.value === "admin" || event.target.value === "member") {
                            void onChangeRole(member.userId, event.target.value);
                          }
                        }}
                        value={member.role}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : null}
                    {canTransfer ? (
                      <Button
                        disabled={pending}
                        onClick={() => {
                          void onTransfer(member.userId);
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Make owner
                      </Button>
                    ) : null}
                    {canRemove ? (
                      <Button
                        disabled={pending}
                        onClick={() => {
                          void onRemove(member.userId);
                        }}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {isSelf ? "Leave" : "Remove"}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!isTeam ? (
          <p className="text-muted-foreground text-xs">
            Personal workspaces do not support member role changes or invites for additional people.
          </p>
        ) : null}
      </div>

      {isTeam && canManage ? (
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
      ) : null}

      {isTeam && !canManage ? (
        <p className="text-muted-foreground text-sm">
          Only workspace owners and admins can create or revoke invites.
        </p>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {isTeam && canManage ? (
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <WorkspaceByoaSection />
    </div>
  );
}
