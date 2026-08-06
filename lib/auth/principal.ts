import type { ConnectionPrincipal } from "eve/connections";

export const BRAIN_AUTH_ISSUER = "brain";

export const LEGACY_CHAT_OWNER_ID = "__legacy__";

export function brainUserPrincipal(
  userId: string,
): Extract<ConnectionPrincipal, { readonly type: "user" }> {
  return {
    type: "user",
    id: userId,
    issuer: BRAIN_AUTH_ISSUER,
  };
}

export function sessionAuthContext(userId: string) {
  return {
    attributes: {},
    authenticator: "brain-session",
    issuer: BRAIN_AUTH_ISSUER,
    principalId: userId,
    principalType: "user" as const,
  };
}
