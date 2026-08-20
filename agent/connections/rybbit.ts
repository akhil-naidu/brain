import { ConnectionAuthorizationRequiredError, defineMcpClientConnection } from "eve/connections";
import { workspaceIdFromIssuer } from "@/lib/auth/principal";
import { internalBrainOrigin } from "@/lib/chat/internal-brain-origin";
import { resolveConnectionToolApproval } from "../lib/define-mcp-oauth-connection";
import { getHttpMcpCredentialSetupError } from "../lib/http-mcp-credentials";
import { mintHttpMcpProxyToken } from "../lib/http-mcp-proxy-token";
import { getHttpMcpUrlConnection } from "../lib/http-mcp-url";

/**
 * Rybbit analytics MCP over Streamable HTTP.
 * https://rybbit.com/docs/mcp
 *
 * Configure the MCP URL and API key via Tools → Set up.
 * Brain fronts the upstream URL through a loopback proxy so the endpoint can
 * differ per workspace.
 */
export const RYBBIT_CONNECTION_NAME = "rybbit";
export const RYBBIT_DISPLAY_NAME = "Rybbit";

const meta = getHttpMcpUrlConnection(RYBBIT_CONNECTION_NAME);
if (!meta) {
  throw new Error("Rybbit HTTP MCP metadata is missing.");
}

/** Loopback Brain proxy; real MCP URL comes from workspace/host/env credentials. */
export const rybbitMcpUrl = `${internalBrainOrigin()}/api/mcp/http/${RYBBIT_CONNECTION_NAME}`;

export const rybbitHttpMcp = meta;

export default defineMcpClientConnection({
  url: rybbitMcpUrl,
  description:
    "Rybbit analytics via official MCP (HTTP): traffic, sites, goals, funnels, and sessions. Configure the MCP URL and API key in Tools → Set up. Cloud default is https://app.rybbit.io/api/mcp; self-hosted uses {BASE_URL}/api/mcp.",
  auth: {
    principalType: "user",
    async getToken({ principal }) {
      const workspaceId =
        principal.type === "user" ? workspaceIdFromIssuer(principal.issuer) : null;
      const setupError = await getHttpMcpCredentialSetupError(RYBBIT_CONNECTION_NAME, workspaceId);
      if (setupError) {
        throw new ConnectionAuthorizationRequiredError(RYBBIT_CONNECTION_NAME, {
          message: setupError,
        });
      }
      const token = mintHttpMcpProxyToken({
        connectionId: RYBBIT_CONNECTION_NAME,
        workspaceId,
      });
      if (!token) {
        throw new ConnectionAuthorizationRequiredError(RYBBIT_CONNECTION_NAME, {
          message: "Brain signing secret is missing; set BETTER_AUTH_SECRET.",
        });
      }
      return { token };
    },
  },
  approval: ({ toolName, toolInput }) =>
    resolveConnectionToolApproval({
      providerName: RYBBIT_CONNECTION_NAME,
      safeReadOnlyTools: meta.safeReadOnlyTools,
      toolName,
      args: toolInput,
    }),
});
