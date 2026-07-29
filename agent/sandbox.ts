import { defineSandbox } from "eve/sandbox";
import { microsandbox } from "eve/sandbox/microsandbox";

// Pin a local sandbox so the agent never falls through to Vercel Sandbox.
export default defineSandbox({
  backend: microsandbox(),
});
