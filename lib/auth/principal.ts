import type { ConnectionPrincipal } from "eve/connections";

export const BRAIN_AUTH_ISSUER = "brain";

export const LEGACY_CHAT_OWNER_ID = "__legacy__";

/** Issuer encodes workspace so MCP token keys isolate grants per workspace. */
export function brainAuthIssuer(workspaceId?: string | null): string {
  const trimmed = workspaceId?.trim();
  return trimmed ? `${BRAIN_AUTH_ISSUER}:${trimmed}` : BRAIN_AUTH_ISSUER;
}

export function brainUserPrincipal(
  userId: string,
  workspaceId?: string | null,
): Extract<ConnectionPrincipal, { readonly type: "user" }> {
  return {
    type: "user",
    id: userId,
    issuer: brainAuthIssuer(workspaceId),
  };
}

export function sessionAuthContext(userId: string, workspaceId?: string | null) {
  const attributes: Record<string, string> = {};
  const trimmedWorkspace = workspaceId?.trim();
  if (trimmedWorkspace) {
    attributes["workspaceId"] = trimmedWorkspace;
  }
  return {
    attributes,
    authenticator: "brain-session",
    issuer: brainAuthIssuer(workspaceId),
    principalId: userId,
    principalType: "user" as const,
  };
}
