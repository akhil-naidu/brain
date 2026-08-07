"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { notifyWorkspacesChanged } from "@/lib/auth/workspace-events";
import {
  inviteUrl,
  isInviteRow,
  isMemberRow,
  isWorkspaceListItem,
  memberLabel,
  type InviteRow,
  type MemberRow,
} from "@/lib/auth/workspace-settings/types";

export function useWorkspaceSettings() {
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

  async function onCreateInvite() {
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

  async function onRevokeInvite(inviteId: string) {
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

  return {
    busy,
    canManage,
    copiedId,
    createdUrl,
    email,
    emailDeliveryNote,
    error,
    invites,
    isTeam,
    loading,
    markCopied,
    members,
    onChangeRole,
    onCreateInvite,
    onRemove,
    onRevokeInvite,
    onTransfer,
    ownerCount,
    pendingAction,
    refresh,
    role,
    setCreatedUrl,
    setEmail,
    setError,
    setRole,
    viewerRole,
    viewerUserId,
    workspaceKind,
    workspaceName,
  } as const;
}
