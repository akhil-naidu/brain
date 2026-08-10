import type { ConnectionPrincipal } from "eve/connections";
import { workspaceIdFromIssuer } from "@/lib/auth/principal";
import { asanaProvider } from "../connections/asana";
import { clickupProvider } from "../connections/clickup";
import { dflowProvider } from "../connections/dflow";
import { githubProvider } from "../connections/github";
import { gmailProvider } from "../connections/gmail";
import { slackProvider } from "../connections/slack";
import { getProviderCredentialSetupError } from "./connection-credentials";
import { getStoredTokenAuthState, type McpOAuthProvider } from "./mcp-oauth";
import { getSnowflakeCredentialSetupError } from "./snowflake-credentials";
import { SNOWFLAKE_CONNECTION_NAME, SNOWFLAKE_DISPLAY_NAME } from "./snowflake-mcp-url";

export type ConnectionAuthStatus = "connected" | "needs_sign_in" | "needs_setup";

export type ConnectionStatusItem = {
  readonly id: string;
  readonly displayName: string;
  readonly status: ConnectionAuthStatus;
  readonly detail?: string;
};

/** OAuth / DCR connections (interactive Connect). */
export const CHAT_CONNECTION_PROVIDERS: readonly McpOAuthProvider[] = [
  clickupProvider,
  slackProvider,
  asanaProvider,
  gmailProvider,
  dflowProvider,
  githubProvider,
];

export function getChatConnectionProvider(id: string): McpOAuthProvider | undefined {
  return CHAT_CONNECTION_PROVIDERS.find((provider) => provider.name === id);
}

export function isSnowflakeConnectionId(id: string): boolean {
  return id === SNOWFLAKE_CONNECTION_NAME;
}

export async function resolveConnectionAuthStatus(
  provider: McpOAuthProvider,
  principal: ConnectionPrincipal,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<ConnectionStatusItem> {
  const workspaceId = principal.type === "user" ? workspaceIdFromIssuer(principal.issuer) : null;
  const setupError = await getProviderCredentialSetupError(provider, env, workspaceId);
  if (setupError) {
    return {
      id: provider.name,
      displayName: provider.displayName,
      status: "needs_setup",
      detail: setupError,
    };
  }

  const tokenState = await getStoredTokenAuthState(provider, principal);
  return {
    id: provider.name,
    displayName: provider.displayName,
    status: tokenState,
  };
}

export async function resolveSnowflakeConnectionAuthStatus(
  principal: ConnectionPrincipal,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<ConnectionStatusItem> {
  const workspaceId = principal.type === "user" ? workspaceIdFromIssuer(principal.issuer) : null;
  const setupError = await getSnowflakeCredentialSetupError(workspaceId, env);
  if (setupError) {
    return {
      id: SNOWFLAKE_CONNECTION_NAME,
      displayName: SNOWFLAKE_DISPLAY_NAME,
      status: "needs_setup",
      detail: setupError,
    };
  }
  return {
    id: SNOWFLAKE_CONNECTION_NAME,
    displayName: SNOWFLAKE_DISPLAY_NAME,
    status: "connected",
  };
}

export async function listChatConnectionStatuses(
  principal: ConnectionPrincipal,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<readonly ConnectionStatusItem[]> {
  const oauthStatuses = await Promise.all(
    CHAT_CONNECTION_PROVIDERS.map((provider) =>
      resolveConnectionAuthStatus(provider, principal, env),
    ),
  );
  return [...oauthStatuses, await resolveSnowflakeConnectionAuthStatus(principal, env)];
}
