import { eveChannel } from "eve/channels/eve";
import { isLoopbackRequest, type AuthFn } from "eve/channels/auth";

/**
 * Loopback sessions as a real `user` principal so interactive connection
 * OAuth (ClickUp MCP) can emit an authorization URL in `eve dev`.
 * `localDev()` alone uses principalType "local-dev", which user-scoped
 * connections reject.
 */
const localDevUser: AuthFn<Request> = (request) => {
  if (!isLoopbackRequest(request)) return null;
  return {
    attributes: {},
    authenticator: "local-dev-user",
    issuer: "local",
    principalId: "local-dev",
    principalType: "user",
  };
};

export default eveChannel({
  auth: [
    localDevUser,
    // Production stays fail-closed until Better Auth (or another) verifier is added.
  ],
});
