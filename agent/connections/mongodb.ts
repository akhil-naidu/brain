import { ConnectionAuthorizationRequiredError, defineMcpClientConnection } from "eve/connections";
import { workspaceIdFromIssuer } from "@/lib/auth/principal";
import { internalBrainOrigin } from "@/lib/chat/internal-brain-origin";
import { approvalForTool } from "../lib/define-mcp-oauth-connection";
import { getHttpMcpCredentialSetupError } from "../lib/http-mcp-credentials";
import { mintHttpMcpProxyToken } from "../lib/http-mcp-proxy-token";
import { getHttpMcpUrlConnection } from "../lib/http-mcp-url";

/**
 * Official MongoDB MCP Server over Streamable HTTP.
 * https://www.mongodb.com/docs/mcp-server/configuration/standalone-service/
 *
 * Configure the MCP URL (and optional bearer token) via Tools → Set up.
 * Brain fronts the upstream URL through a loopback proxy so the endpoint can
 * differ per workspace.
 */
export const MONGODB_CONNECTION_NAME = "mongodb";
export const MONGODB_DISPLAY_NAME = "MongoDB";

const meta = getHttpMcpUrlConnection(MONGODB_CONNECTION_NAME);
if (!meta) {
  throw new Error("MongoDB HTTP MCP metadata is missing.");
}

/** Loopback Brain proxy; real MCP URL comes from workspace/host/env credentials. */
export const mongodbMcpUrl = `${internalBrainOrigin()}/api/mcp/http/${MONGODB_CONNECTION_NAME}`;

export const mongodbHttpMcp = meta;

export default defineMcpClientConnection({
  url: mongodbMcpUrl,
  description:
    "MongoDB via official MCP Server (HTTP): query, aggregations, schema, and Atlas inspection. Configure the MCP URL in Tools → Set up. Prefer a read-only MCP deployment (`--readOnly` / MDB_MCP_READ_ONLY). The MongoDB connection string lives on the MCP server, not in Brain.",
  auth: {
    principalType: "user",
    async getToken({ principal }) {
      const workspaceId =
        principal.type === "user" ? workspaceIdFromIssuer(principal.issuer) : null;
      const setupError = await getHttpMcpCredentialSetupError(MONGODB_CONNECTION_NAME, workspaceId);
      if (setupError) {
        throw new ConnectionAuthorizationRequiredError(MONGODB_CONNECTION_NAME, {
          message: setupError,
        });
      }
      const token = mintHttpMcpProxyToken({
        connectionId: MONGODB_CONNECTION_NAME,
        workspaceId,
      });
      if (!token) {
        throw new ConnectionAuthorizationRequiredError(MONGODB_CONNECTION_NAME, {
          message: "Brain signing secret is missing; set BETTER_AUTH_SECRET.",
        });
      }
      return { token };
    },
  },
  approval: ({ toolName }) =>
    approvalForTool(MONGODB_CONNECTION_NAME, meta.safeReadOnlyTools, toolName),
});
