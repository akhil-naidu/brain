import type { ConnectionPrincipal } from "eve/connections";
import {
  brainUserPrincipal,
  isBrainSessionIssuer,
  workspaceIdFromIssuer,
} from "@/lib/auth/principal";
import { getSlackInboundStore } from "@/lib/chat/slack-inbound/store";

function parseSlackPrincipal(
  principal: ConnectionPrincipal,
): { readonly slackTeamId: string; readonly slackUserId: string } | null {
  if (principal.type !== "user") {
    return null;
  }
  const issuer = principal.issuer ?? "";
  if (!issuer.startsWith("slack")) {
    return null;
  }
  const teamFromIssuer = issuer.startsWith("slack:") ? issuer.slice("slack:".length).trim() : "";
  const parts = principal.id.split(":");
  if (parts[0] !== "slack") {
    return null;
  }
  if (parts.length >= 3 && parts[1] && parts[2] && parts[1] !== "bot") {
    return { slackTeamId: parts[1], slackUserId: parts[2] };
  }
  if (parts.length === 2 && parts[1] && teamFromIssuer) {
    return { slackTeamId: teamFromIssuer, slackUserId: parts[1] };
  }
  return null;
}

/** Map a Slack-webhook principal back to the Brain user who owns that Slack identity. */
export async function resolveBrainConnectionPrincipal(
  principal: ConnectionPrincipal,
): Promise<ConnectionPrincipal> {
  if (principal.type === "user" && isBrainSessionIssuer(principal.issuer)) {
    return principal;
  }
  const slack = parseSlackPrincipal(principal);
  if (!slack) {
    return principal;
  }
  const identity = await getSlackInboundStore().lookupBySlackUser(
    slack.slackTeamId,
    slack.slackUserId,
  );
  if (!identity) {
    return principal;
  }
  return brainUserPrincipal(identity.userId, identity.workspaceId);
}

export function brainPrincipalFromSessionAuth(auth: {
  readonly current: {
    readonly principalId?: string | null;
    readonly principalType?: string | null;
    readonly issuer?: string | null;
    readonly authenticator?: string | null;
  } | null;
  readonly initiator: {
    readonly principalId?: string | null;
    readonly principalType?: string | null;
    readonly issuer?: string | null;
    readonly authenticator?: string | null;
  } | null;
}): ConnectionPrincipal | null {
  const preferred =
    auth.current?.authenticator === "brain-session" || isBrainSessionIssuer(auth.current?.issuer)
      ? auth.current
      : auth.initiator?.authenticator === "brain-session" ||
          isBrainSessionIssuer(auth.initiator?.issuer)
        ? auth.initiator
        : null;
  if (!preferred || preferred.principalType !== "user" || !preferred.principalId?.trim()) {
    return null;
  }
  const workspaceId = workspaceIdFromIssuer(preferred.issuer);
  return brainUserPrincipal(preferred.principalId.trim(), workspaceId);
}

export function slackInboundAuthAttributes(input: {
  readonly slackUserId: string;
  readonly slackTeamId: string;
  readonly slackChannelId: string;
  readonly slackThreadTs: string;
}): Record<string, string> {
  return {
    source: "slack-inbound",
    slack_user_id: input.slackUserId,
    slack_team_id: input.slackTeamId,
    slack_channel_id: input.slackChannelId,
    slack_thread_ts: input.slackThreadTs,
  };
}
