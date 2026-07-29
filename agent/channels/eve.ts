import { eveChannel } from "eve/channels/eve";
import { localDev } from "eve/channels/auth";

export default eveChannel({
  auth: [
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // Production stays fail-closed until a non-Vercel authenticator is added
    // (JWT, Clerk, Auth.js, API key, or custom AuthFn). Do not use vercelOidc().
  ],
});
