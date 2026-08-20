import { ConnectionAuthorizationRequiredError, defineMcpClientConnection } from "eve/connections";
import { workspaceIdFromIssuer } from "@/lib/auth/principal";
import { internalBrainOrigin } from "@/lib/chat/internal-brain-origin";
import { resolveConnectionToolApproval } from "../lib/define-mcp-oauth-connection";
import { getHttpMcpCredentialSetupError } from "../lib/http-mcp-credentials";
import { mintHttpMcpProxyToken } from "../lib/http-mcp-proxy-token";
import { getHttpMcpUrlConnection } from "../lib/http-mcp-url";

/**
 * Bytebot desktop MCP (computer-use) over HTTP.
 * https://docs.bytebot.ai/core-concepts/desktop-environment
 *
 * Configure the MCP URL (and optional bearer) via Tools → Set up.
 * Brain fronts the upstream URL through a loopback proxy so the endpoint can
 * differ per workspace.
 */
export const BYTEBOT_CONNECTION_NAME = "bytebot";
export const BYTEBOT_DISPLAY_NAME = "Bytebot";

const meta = getHttpMcpUrlConnection(BYTEBOT_CONNECTION_NAME);
if (!meta) {
  throw new Error("Bytebot HTTP MCP metadata is missing.");
}

/** Loopback Brain proxy; real MCP URL comes from workspace/host/env credentials. */
export const bytebotMcpUrl = `${internalBrainOrigin()}/api/mcp/http/${BYTEBOT_CONNECTION_NAME}`;

export const bytebotHttpMcp = meta;

export default defineMcpClientConnection({
  url: bytebotMcpUrl,
  description:
    "Bytebot desktop agent via MCP (HTTP): screenshot, mouse, and keyboard on a container Linux desktop. Configure the MCP URL in Tools → Set up (default http://localhost:9990/mcp). Desktop control tools require approval.",
  auth: {
    principalType: "user",
    async getToken({ principal }) {
      const workspaceId =
        principal.type === "user" ? workspaceIdFromIssuer(principal.issuer) : null;
      const setupError = await getHttpMcpCredentialSetupError(BYTEBOT_CONNECTION_NAME, workspaceId);
      if (setupError) {
        throw new ConnectionAuthorizationRequiredError(BYTEBOT_CONNECTION_NAME, {
          message: setupError,
        });
      }
      const token = mintHttpMcpProxyToken({
        connectionId: BYTEBOT_CONNECTION_NAME,
        workspaceId,
      });
      if (!token) {
        throw new ConnectionAuthorizationRequiredError(BYTEBOT_CONNECTION_NAME, {
          message: "Brain signing secret is missing; set BETTER_AUTH_SECRET.",
        });
      }
      return { token };
    },
  },
  approval: ({ toolName, toolInput }) =>
    resolveConnectionToolApproval({
      providerName: BYTEBOT_CONNECTION_NAME,
      safeReadOnlyTools: meta.safeReadOnlyTools,
      toolName,
      args: toolInput,
    }),
});
