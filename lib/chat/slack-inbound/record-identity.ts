import { listStoredUserTokens, type StoredToken } from "@/agent/lib/mcp-oauth";
import { workspaceIdFromIssuer } from "@/lib/auth/principal";
import { asStringKeyedRecord } from "@/lib/chat/slack-inbound/json-object";
import { getSlackInboundStore } from "@/lib/chat/slack-inbound/store";
import type { ConnectionPrincipal } from "eve/connections";

const authTestResponseSchema = {
  parse(json: unknown): { readonly userId: string; readonly teamId: string } | null {
    const record = asStringKeyedRecord(json);
    if (!record) {
      return null;
    }
    if (record["ok"] !== true) {
      return null;
    }
    const userId = record["user_id"];
    const teamId = record["team_id"];
    if (typeof userId !== "string" || !userId.trim()) {
      return null;
    }
    if (typeof teamId !== "string" || !teamId.trim()) {
      return null;
    }
    return { userId: userId.trim(), teamId: teamId.trim() };
  },
};

export async function fetchSlackAuthTest(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ readonly userId: string; readonly teamId: string } | null> {
  try {
    const response = await fetchImpl("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "",
    });
    if (!response.ok) {
      return null;
    }
    return authTestResponseSchema.parse(await response.json());
  } catch {
    return null;
  }
}

export async function recordSlackIdentityFromUserToken(
  principal: Extract<ConnectionPrincipal, { readonly type: "user" }>,
  token: Pick<StoredToken, "accessToken">,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const workspaceId = workspaceIdFromIssuer(principal.issuer);
  if (!workspaceId) {
    return false;
  }
  const identity = await fetchSlackAuthTest(token.accessToken, fetchImpl);
  if (!identity) {
    return false;
  }
  await getSlackInboundStore().upsertIdentity({
    userId: principal.id,
    workspaceId,
    slackTeamId: identity.teamId,
    slackUserId: identity.userId,
  });
  return true;
}

export async function forgetSlackIdentity(
  principal: Extract<ConnectionPrincipal, { readonly type: "user" }>,
): Promise<void> {
  const workspaceId = workspaceIdFromIssuer(principal.issuer);
  if (!workspaceId) {
    return;
  }
  await getSlackInboundStore().deleteIdentity(principal.id, workspaceId);
}

let backfillStarted = false;

export async function backfillSlackIdentitiesOnce(fetchImpl: typeof fetch = fetch): Promise<void> {
  if (backfillStarted) {
    return;
  }
  backfillStarted = true;
  const stored = await listStoredUserTokens({ name: "slack" });
  await Promise.all(
    stored.map((entry) =>
      recordSlackIdentityFromUserToken(entry.principal, entry.token, fetchImpl),
    ),
  );
}

export function resetSlackIdentityBackfillForTests(): void {
  backfillStarted = false;
}
