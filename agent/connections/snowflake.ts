import { ConnectionAuthorizationRequiredError, defineMcpClientConnection } from "eve/connections";
import { workspaceIdFromIssuer } from "@/lib/auth/principal";
import { internalBrainOrigin } from "@/lib/chat/internal-brain-origin";
import { approvalForTool } from "../lib/define-mcp-oauth-connection";
import {
  getSnowflakeCredentialSetupError,
  resolveSnowflakeCredentials,
} from "../lib/snowflake-credentials";
import {
  SNOWFLAKE_CONNECTION_NAME as CONNECTION_NAME,
  SNOWFLAKE_DISPLAY_NAME as DISPLAY_NAME,
  SNOWFLAKE_PLACEHOLDER_MCP_URL,
} from "../lib/snowflake-mcp-url";
import { mintSnowflakeProxyToken } from "../lib/snowflake-proxy-token";

/**
 * Snowflake-managed MCP server (Cortex Agents / SQL / Search / custom tools).
 * https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp
 *
 * Auth matches the Cursor Snowflake plugin (MCP server URL + PAT), stored per
 * workspace (or host/env fallback). Eve requires a static connection URL, so
 * Brain fronts Snowflake through a loopback proxy that resolves workspace
 * credentials per turn.
 */
export const SNOWFLAKE_CONNECTION_NAME = CONNECTION_NAME;
export const SNOWFLAKE_DISPLAY_NAME = DISPLAY_NAME;

/** Tool names are server-defined; gate all calls until reviewed. */
export const SNOWFLAKE_SAFE_READ_ONLY_TOOLS: readonly string[] = [];

/** Loopback Brain proxy; real Snowflake URL comes from workspace/host/env credentials. */
export const snowflakeMcpUrl = `${internalBrainOrigin()}/api/mcp/snowflake`;

export default defineMcpClientConnection({
  url: snowflakeMcpUrl || SNOWFLAKE_PLACEHOLDER_MCP_URL,
  description:
    "Snowflake-managed MCP: Cortex Search/Analyst, SQL, agents, and custom tools for the active workspace (PAT auth). Use for warehouse data questions and Snowflake operations the server exposes.",
  auth: {
    principalType: "user",
    async getToken({ principal }) {
      const workspaceId =
        principal.type === "user" ? workspaceIdFromIssuer(principal.issuer) : null;
      const setupError = await getSnowflakeCredentialSetupError(workspaceId);
      if (setupError) {
        throw new ConnectionAuthorizationRequiredError(SNOWFLAKE_CONNECTION_NAME, {
          message: setupError,
        });
      }
      const credentials = await resolveSnowflakeCredentials(workspaceId);
      if (!credentials) {
        throw new ConnectionAuthorizationRequiredError(SNOWFLAKE_CONNECTION_NAME, {
          message: "Snowflake is not configured.",
        });
      }
      const token = mintSnowflakeProxyToken({ workspaceId });
      if (!token) {
        throw new ConnectionAuthorizationRequiredError(SNOWFLAKE_CONNECTION_NAME, {
          message: "Brain signing secret is missing; set BETTER_AUTH_SECRET.",
        });
      }
      return { token };
    },
  },
  approval: ({ toolName }) =>
    approvalForTool(SNOWFLAKE_CONNECTION_NAME, SNOWFLAKE_SAFE_READ_ONLY_TOOLS, toolName),
});
