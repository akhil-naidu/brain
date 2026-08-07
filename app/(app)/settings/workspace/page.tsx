"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notifyWorkspacesChanged } from "@/lib/auth/workspace-events";
import { WorkspaceScimSection } from "@/components/chat/workspace-scim-section";
import { WorkspaceSsoSection } from "@/components/chat/workspace-sso-section";
import { SettingsRowsSkeleton } from "@/components/loading/skeletons";
import {
  SettingsBadge,
  SettingsPanel,
  SettingsSection,
  SettingsShell,
  SettingsTabs,
} from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useTabSearchParam } from "@/lib/navigation/use-tab-search-param";

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

function WorkspaceSettingsPage() {
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
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [emailDeliveryNote, setEmailDeliveryNote] = useState<string | null>(null);
  const copiedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markCopied = useCallback((id: string) => {
    setCopiedId(id);
    if (copiedResetRef.current) {
      clearTimeout(copiedResetRef.current);
    }
    copiedResetRef.current = setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  }, []);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (copiedResetRef.current) {
        clearTimeout(copiedResetRef.current);
      }
    };
  }, []);

  async function onCreate() {
    setPendingAction("invite-create");
    setError(null);
    setCreatedUrl(null);
    setEmailDeliveryNote(null);
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
        setPendingAction(null);
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
          markCopied(data.invite.id);
        } catch {
          // ignore clipboard failures
        }
        const bound = data.invite.email;
        if (bound) {
          if ("emailSent" in data && data.emailSent === true) {
            setEmailDeliveryNote(`Invite email sent to ${bound}.`);
          } else if ("emailSkipReason" in data && data.emailSkipReason === "smtp-not-configured") {
            setEmailDeliveryNote(
              "Invite created. Email not sent — configure BRAIN_SMTP_* / BRAIN_EMAIL_FROM, or share the link.",
            );
          } else if (
            "emailSkipReason" in data &&
            typeof data.emailSkipReason === "string" &&
            data.emailSkipReason
          ) {
            setEmailDeliveryNote(
              `Invite created, but email failed (${data.emailSkipReason}). Share the link instead.`,
            );
          }
        }
      }
      setEmail("");
      setPendingAction(null);
      await refresh();
    } catch {
      setPendingAction(null);
      setError("Unable to create invite.");
    }
  }

  async function onRevoke(inviteId: string) {
    if (!window.confirm("Revoke this invite? The link will stop working.")) {
      return;
    }
    setPendingAction(`invite-revoke:${inviteId}`);
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
        setPendingAction(null);
        return;
      }
      setPendingAction(null);
      await refresh();
    } catch {
      setPendingAction(null);
      setError("Unable to revoke invite.");
    }
  }

  async function onChangeRole(userId: string, nextRole: "admin" | "member") {
    const previous = members.find((member) => member.userId === userId)?.role;
    setMembers((current) =>
      current.map((member) => (member.userId === userId ? { ...member, role: nextRole } : member)),
    );
    setPendingAction(`role:${userId}`);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/members/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        if (previous) {
          setMembers((current) =>
            current.map((member) =>
              member.userId === userId ? { ...member, role: previous } : member,
            ),
          );
        }
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to update role.",
        );
        setPendingAction(null);
        return;
      }
      setPendingAction(null);
      notifyWorkspacesChanged();
      await refresh();
    } catch {
      if (previous) {
        setMembers((current) =>
          current.map((member) =>
            member.userId === userId ? { ...member, role: previous } : member,
          ),
        );
      }
      setPendingAction(null);
      setError("Unable to update role.");
    }
  }

  async function onRemove(userId: string) {
    const isSelf = userId === viewerUserId;
    const label = isSelf
      ? "Leave this workspace? You will lose access until invited again."
      : "Remove this member from the workspace?";
    if (!window.confirm(label)) {
      return;
    }
    setPendingAction(`remove:${userId}`);
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
        setPendingAction(null);
        return;
      }
      setPendingAction(null);
      notifyWorkspacesChanged();
      if (isSelf) {
        window.location.assign("/chat");
        return;
      }
      await refresh();
    } catch {
      setPendingAction(null);
      setError("Unable to remove member.");
    }
  }

  async function onTransfer(userId: string) {
    const target = members.find((member) => member.userId === userId);
    const label = target ? memberLabel(target) : "this member";
    if (!window.confirm(`Make ${label} the workspace owner? You will become an admin.`)) {
      return;
    }
    setPendingAction(`transfer:${userId}`);
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
        setPendingAction(null);
        return;
      }
      setPendingAction(null);
      notifyWorkspacesChanged();
      await refresh();
    } catch {
      setPendingAction(null);
      setError("Unable to transfer ownership.");
    }
  }

  const isTeam = workspaceKind === "team";
  const ownerCount = members.filter((member) => member.role === "owner").length;
  const busy = pendingAction !== null;

  const tabs = useMemo(() => {
    const items = [{ id: "people", label: "People" }];
    if (isTeam) {
      items.push({ id: "invites", label: "Invites" }, { id: "security", label: "Security" });
    }
    return items;
  }, [isTeam]);

  const tabIds = useMemo(() => tabs.map((item) => item.id), [tabs]);
  const [tab, setTab] = useTabSearchParam({
    defaultTab: "people",
    ready: workspaceKind !== null,
    tabs: tabIds,
  });

  return (
    <SettingsShell
      description="Manage who can access this workspace and how they sign in."
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <SettingsBadge>{workspaceKind === "personal" ? "Personal" : "Team"}</SettingsBadge>
          {viewerRole ? <SettingsBadge>{viewerRole}</SettingsBadge> : null}
          {workspaceName ? (
            <span className="text-muted-foreground text-sm">{workspaceName}</span>
          ) : null}
        </div>
      }
      title="Workspace"
    >
      <SettingsTabs active={tab} onChange={setTab} tabs={tabs} />

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {tab === "people" ? (
        <SettingsSection
          description={
            isTeam
              ? "Owners and admins can change roles. Transfer ownership from the owner account."
              : "Personal workspaces are just for you. Create a team workspace to invite others."
          }
          title="Members"
        >
          <SettingsPanel>
            {loading ? (
              <SettingsRowsSkeleton rows={3} />
            ) : members.length === 0 ? (
              <p className="text-muted-foreground px-4 py-6 text-sm">
                No members found for this workspace.
              </p>
            ) : (
              <ul className="divide-border/70 divide-y">
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
                  const rowBusy =
                    pendingAction === `role:${member.userId}` ||
                    pendingAction === `remove:${member.userId}` ||
                    pendingAction === `transfer:${member.userId}`;
                  return (
                    <li
                      className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                      key={member.userId}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                          {memberLabel(member).slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {memberLabel(member)}
                            {isSelf ? (
                              <span className="text-muted-foreground font-normal"> · you</span>
                            ) : null}
                          </p>
                          <p className="text-muted-foreground text-xs capitalize">{member.role}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {canEditRole ? (
                          <FieldSelect
                            aria-label={`Role for ${memberLabel(member)}`}
                            disabled={rowBusy}
                            onValueChange={(value) => {
                              if (value === "admin" || value === "member") {
                                void onChangeRole(member.userId, value);
                              }
                            }}
                            options={[
                              { value: "member", label: "Member" },
                              { value: "admin", label: "Admin" },
                            ]}
                            size="sm"
                            triggerClassName="w-[7.5rem]"
                            value={member.role === "admin" ? "admin" : "member"}
                          />
                        ) : null}
                        {canTransfer ? (
                          <Button
                            disabled={busy}
                            onClick={() => {
                              void onTransfer(member.userId);
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {pendingAction === `transfer:${member.userId}`
                              ? "Transferring…"
                              : "Make owner"}
                          </Button>
                        ) : null}
                        {canRemove ? (
                          <Button
                            disabled={busy}
                            onClick={() => {
                              void onRemove(member.userId);
                            }}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            {pendingAction === `remove:${member.userId}`
                              ? isSelf
                                ? "Leaving…"
                                : "Removing…"
                              : isSelf
                                ? "Leave"
                                : "Remove"}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SettingsPanel>
        </SettingsSection>
      ) : null}

      {tab === "invites" ? (
        <div className="space-y-8">
          {canManage ? (
            <SettingsSection
              description="Optional email binding sends an invite when SMTP is configured."
              title="Create invite"
            >
              <SettingsPanel className="space-y-4 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="invite-email">Email (optional)</FieldLabel>
                    <Input
                      id="invite-email"
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="person@example.com"
                      type="email"
                      value={email}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="invite-role">Role</FieldLabel>
                    <FieldSelect
                      id="invite-role"
                      onValueChange={(value) => {
                        if (value === "admin" || value === "member") {
                          setRole(value);
                        }
                      }}
                      options={[
                        { value: "member", label: "Member" },
                        { value: "admin", label: "Admin" },
                      ]}
                      value={role}
                    />
                  </Field>
                </div>
                <Button
                  disabled={busy}
                  onClick={() => {
                    void onCreate();
                  }}
                  type="button"
                >
                  {pendingAction === "invite-create" ? "Creating…" : "Create invite link"}
                </Button>
                {emailDeliveryNote ? (
                  <p className="text-muted-foreground text-xs">{emailDeliveryNote}</p>
                ) : null}
                {createdUrl ? (
                  <div className="bg-muted/40 space-y-1 rounded-lg p-3">
                    <p className="text-xs font-medium">Invite link</p>
                    <p className="font-mono text-xs break-all">{createdUrl}</p>
                    <p className="text-muted-foreground text-xs">
                      {copiedId ? "Copied to clipboard." : "Copy and share this link."}
                    </p>
                  </div>
                ) : null}
              </SettingsPanel>
            </SettingsSection>
          ) : (
            <p className="text-muted-foreground text-sm">
              Only workspace owners and admins can create or revoke invites.
            </p>
          )}

          {canManage ? (
            <SettingsSection title="Outstanding invites">
              <SettingsPanel>
                {invites.length === 0 ? (
                  <p className="text-muted-foreground px-4 py-6 text-sm">No active invites.</p>
                ) : (
                  <ul className="divide-border/70 divide-y">
                    {invites.map((invite) => (
                      <li
                        className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                        key={invite.id}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="truncate text-sm font-medium">
                            {invite.email ?? "Anyone with the link"}
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              · {invite.role}
                            </span>
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Expires {new Date(invite.expiresAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            disabled={busy}
                            onClick={() => {
                              void (async () => {
                                try {
                                  await navigator.clipboard.writeText(inviteUrl(invite.token));
                                  markCopied(invite.id);
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
                            disabled={busy}
                            onClick={() => {
                              void onRevoke(invite.id);
                            }}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            {pendingAction === `invite-revoke:${invite.id}`
                              ? "Revoking…"
                              : "Revoke"}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SettingsPanel>
            </SettingsSection>
          ) : null}
        </div>
      ) : null}

      {tab === "security" ? (
        <div className="space-y-6">
          <WorkspaceSsoSection canManage={canManage} enabled={isTeam} />
          <WorkspaceScimSection canManage={canManage} enabled={isTeam} />
        </div>
      ) : null}
    </SettingsShell>
  );
}

export default function WorkspaceSettingsRoute() {
  return (
    <Suspense
      fallback={
        <SettingsShell
          description="Manage who can access this workspace and how they sign in."
          title="Workspace"
        >
          <SettingsPanel>
            <SettingsRowsSkeleton rows={4} />
          </SettingsPanel>
        </SettingsShell>
      }
    >
      <WorkspaceSettingsPage />
    </Suspense>
  );
}
