export type InviteRow = {
  readonly id: string;
  readonly token: string;
  readonly email: string | null;
  readonly role: string;
  readonly expiresAt: string;
};

export type WorkspaceListItem = {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly kind?: string;
};

export type MemberRow = {
  readonly userId: string;
  readonly role: "owner" | "admin" | "member";
  readonly email: string | null;
  readonly name: string | null;
};

export function isInviteRow(value: unknown): value is InviteRow {
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

export function isWorkspaceListItem(value: unknown): value is WorkspaceListItem {
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

export function isMemberRow(value: unknown): value is MemberRow {
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

export function inviteUrl(token: string): string {
  if (typeof window === "undefined") {
    return `/invite/${token}`;
  }
  return `${window.location.origin}/invite/${token}`;
}

export function memberLabel(member: MemberRow): string {
  return member.email ?? member.name ?? member.userId.slice(0, 8);
}
