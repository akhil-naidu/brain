import { eveChannel } from "eve/channels/eve";
import type { AuthFn } from "eve/channels/auth";

/**
 * SECURITY: Every caller shares one principal and all of its OAuth grants.
 * This channel is safe only behind a trusted local boundary, never on the public internet.
 */
const anonymousUser: AuthFn = () => ({
  attributes: {},
  authenticator: "anonymous",
  issuer: "local",
  principalId: "anonymous",
  principalType: "user",
});

export default eveChannel({
  auth: [anonymousUser],
  uploadPolicy: "disabled",
});
