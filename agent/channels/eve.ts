import { eveChannel } from "eve/channels/eve";
import type { AuthFn } from "eve/channels/auth";
import { withAuthChallenges } from "eve/channels/auth";
import { resolveBrainSessionAuthFromRequest } from "@/lib/auth/session-from-request";

/**
 * Brain browser chat auth: Better Auth session cookie (or internal operator bearer).
 * Unauthenticated callers receive 401 — there is no shared anonymous principal.
 */
const brainSessionAuth: AuthFn = withAuthChallenges(
  async (request) => {
    return resolveBrainSessionAuthFromRequest(request);
  },
  [{ scheme: "Bearer" }],
);

export default eveChannel({
  auth: [brainSessionAuth],
  uploadPolicy: "disabled",
});
