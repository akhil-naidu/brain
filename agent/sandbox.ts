import { defineSandbox } from "eve/sandbox";
import { microsandbox } from "eve/sandbox/microsandbox";
import {
  githubNetworkPolicyForPrincipal,
  principalForSandboxAuth,
} from "@/agent/lib/ensure-attached-repo";

// Pin a local sandbox so the agent never falls through to Vercel Sandbox.
export default defineSandbox({
  backend: microsandbox(),
  async onSession({ use: openSandbox, ctx }) {
    const principal = principalForSandboxAuth(ctx.session.auth);
    await openSandbox({
      networkPolicy: await githubNetworkPolicyForPrincipal(principal),
    });
  },
});
