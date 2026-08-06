import type { ConnectionPrincipal } from "eve/connections";
import { asanaProvider } from "../connections/asana";
import { clickupProvider } from "../connections/clickup";
import { dflowProvider } from "../connections/dflow";
import { githubProvider } from "../connections/github";
import { gmailProvider } from "../connections/gmail";
import { slackProvider } from "../connections/slack";
import { createSnowflakeProvider } from "../connections/snowflake";
import { getProviderCredentialSetupError } from "./connection-credentials";
import { getStoredTokenAuthState, type McpOAuthProvider } from "./mcp-oauth";

/** Matches the anonymous chat channel principal in `agent/channels/eve.ts`. */
export const ANONYMOUS_CHAT_PRINCIPAL: ConnectionPrincipal = {
  type: "user",
  id: "anonymous",
  issuer: "local",
};

export type ConnectionAuthStatus = "connected" | "needs_sign_in" | "needs_setup";

export type ConnectionStatusItem = {
  readonly id: string;
  readonly displayName: string;
  readonly status: ConnectionAuthStatus;
  readonly detail?: string;
};

export function listChatConnectionProviders(
  env: { readonly [key: string]: string | undefined } = process.env,
): readonly McpOAuthProvider[] {
  return [
    clickupProvider,
    slackProvider,
    asanaProvider,
    gmailProvider,
    dflowProvider,
    githubProvider,
    createSnowflakeProvider(env),
  ];
}

/** Snapshot of providers for the current process env (Snowflake URL may vary). */
export const CHAT_CONNECTION_PROVIDERS: readonly McpOAuthProvider[] = listChatConnectionProviders();

export function getChatConnectionProvider(
  id: string,
  env: { readonly [key: string]: string | undefined } = process.env,
): McpOAuthProvider | undefined {
  return listChatConnectionProviders(env).find((provider) => provider.name === id);
}

export async function resolveConnectionAuthStatus(
  provider: McpOAuthProvider,
  principal: ConnectionPrincipal = ANONYMOUS_CHAT_PRINCIPAL,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<ConnectionStatusItem> {
  const setupError = await getProviderCredentialSetupError(provider, env);
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

export async function listChatConnectionStatuses(
  principal: ConnectionPrincipal = ANONYMOUS_CHAT_PRINCIPAL,
  env: { readonly [key: string]: string | undefined } = process.env,
): Promise<readonly ConnectionStatusItem[]> {
  return Promise.all(
    listChatConnectionProviders(env).map((provider) =>
      resolveConnectionAuthStatus(provider, principal, env),
    ),
  );
}
