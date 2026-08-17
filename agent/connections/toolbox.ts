import { ConnectionAuthorizationRequiredError, defineMcpClientConnection } from "eve/connections";
import { workspaceIdFromIssuer } from "@/lib/auth/principal";
import { internalBrainOrigin } from "@/lib/chat/internal-brain-origin";
import { resolveConnectionToolApproval } from "../lib/define-mcp-oauth-connection";
import { getHttpMcpCredentialSetupError } from "../lib/http-mcp-credentials";
import { mintHttpMcpProxyToken } from "../lib/http-mcp-proxy-token";
import { getHttpMcpUrlConnection } from "../lib/http-mcp-url";

/**
 * Google MCP Toolbox for Databases (Streamable HTTP).
 * https://mcp-toolbox.dev/documentation/getting-started/mcp_quickstart/
 * https://mcp-toolbox.dev/documentation/connect-to/mcp-client/
 *
 * Configure the Toolbox MCP URL via Tools → Set up. Brain fronts the upstream
 * URL through a loopback proxy so the endpoint can differ per workspace.
 */
export const TOOLBOX_CONNECTION_NAME = "toolbox";
export const TOOLBOX_DISPLAY_NAME = "MCP Toolbox";

const meta = getHttpMcpUrlConnection(TOOLBOX_CONNECTION_NAME);
if (!meta) {
  throw new Error("MCP Toolbox HTTP MCP metadata is missing.");
}

/** Loopback Brain proxy; real MCP URL comes from workspace/host/env credentials. */
export const toolboxMcpUrl = `${internalBrainOrigin()}/api/mcp/http/${TOOLBOX_CONNECTION_NAME}`;

export const toolboxHttpMcp = meta;

export default defineMcpClientConnection({
  url: toolboxMcpUrl,
  description:
    "MCP Toolbox for Databases: SQL and data-source tools from a Toolbox deployment (tools.yaml). Configure the Streamable HTTP MCP URL in Tools → Set up.",
  auth: {
    principalType: "user",
    async getToken({ principal }) {
      const workspaceId =
        principal.type === "user" ? workspaceIdFromIssuer(principal.issuer) : null;
      const setupError = await getHttpMcpCredentialSetupError(TOOLBOX_CONNECTION_NAME, workspaceId);
      if (setupError) {
        throw new ConnectionAuthorizationRequiredError(TOOLBOX_CONNECTION_NAME, {
          message: setupError,
        });
      }
      const token = mintHttpMcpProxyToken({
        connectionId: TOOLBOX_CONNECTION_NAME,
        workspaceId,
      });
      if (!token) {
        throw new ConnectionAuthorizationRequiredError(TOOLBOX_CONNECTION_NAME, {
          message: "Brain signing secret is missing; set BETTER_AUTH_SECRET.",
        });
      }
      return { token };
    },
  },
  approval: ({ toolName, toolInput }) =>
    resolveConnectionToolApproval({
      providerName: TOOLBOX_CONNECTION_NAME,
      safeReadOnlyTools: meta.safeReadOnlyTools,
      toolName,
      args: toolInput,
    }),
});
