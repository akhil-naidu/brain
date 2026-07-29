import { eveChannel } from "eve/channels/eve";
import type { AuthFn } from "eve/channels/auth";

/** Local/trusted open access — not for public internet without a real AuthFn. */
const anonymousUser: AuthFn<Request> = () => ({
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
