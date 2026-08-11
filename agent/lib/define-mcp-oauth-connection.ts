import {
  ConnectionAuthorizationFailedError,
  ConnectionAuthorizationRequiredError,
  defineInteractiveAuthorization,
  defineMcpClientConnection,
} from "eve/connections";
import { workspaceIdFromIssuer } from "@/lib/auth/principal";
import type { BrainChatMode } from "@/lib/chat/chat-mode";
import { turnChatMode } from "@/agent/lib/turn-chat-mode-state";
import {
  authorizeUrlPath,
  buildAuthorizeUrl,
  deleteStoredToken,
  exchangeAuthorizationCode,
  generateOAuthState,
  getStoredAccessToken,
  makePkce,
  type McpOAuthProvider,
  publishAuthorizeUrl,
  storeAccessToken,
  verifyOAuthState,
} from "./mcp-oauth";

export type McpOAuthResume = {
  verifier: string;
  clientId: string;
  clientSecret?: string;
  state: string;
};

export type ConnectionToolApproval =
  "not-applicable" | "user-approval" | { readonly type: "denied"; readonly reason: string };

export function approvalForTool(
  providerName: string,
  safeReadOnlyTools: readonly string[],
  qualifiedToolName: string,
  mode: BrainChatMode = "agent",
): ConnectionToolApproval {
  const prefix = `${providerName}__`;
  const remoteToolName = qualifiedToolName.startsWith(prefix)
    ? qualifiedToolName.slice(prefix.length)
    : qualifiedToolName;
  const isSafeRead = safeReadOnlyTools.includes(remoteToolName);

  if (mode === "ask") {
    return {
      type: "denied",
      reason: "Ask mode blocks connection tools. Switch to Agent mode.",
    };
  }

  if (!qualifiedToolName.startsWith(prefix)) {
    return "user-approval";
  }

  return isSafeRead ? "not-applicable" : "user-approval";
}

export function defineMcpOAuthConnection(opts: {
  provider: McpOAuthProvider;
  description: string;
}) {
  const { provider, description } = opts;
  const fileHint = authorizeUrlPath(provider.name);

  return defineMcpClientConnection({
    url: provider.mcpUrl,
    description,
    auth: defineInteractiveAuthorization<McpOAuthResume>({
      async getToken({ principal }) {
        const cached = await getStoredAccessToken(provider, principal);
        if (!cached) {
          throw new ConnectionAuthorizationRequiredError(provider.name);
        }
        return { token: cached.token, expiresAt: cached.expiresAt };
      },
      async evict({ principal }) {
        try {
          await deleteStoredToken(provider, principal);
        } catch {
          console.error(`Could not evict the stored ${provider.displayName} OAuth token.`);
        }
      },
      async startAuthorization({ callbackUrl, principal }) {
        const { verifier, challenge } = makePkce();
        const state = generateOAuthState();
        const workspaceId =
          principal && typeof principal === "object" && "issuer" in principal
            ? workspaceIdFromIssuer(typeof principal.issuer === "string" ? principal.issuer : null)
            : null;
        const { url, clientId, clientSecret } = await buildAuthorizeUrl(provider, {
          callbackUrl,
          codeChallenge: challenge,
          state,
          workspaceId,
        });
        await publishAuthorizeUrl(provider, url, callbackUrl);
        return {
          challenge: {
            url,
            displayName: provider.displayName,
            instructions: `A browser should open for ${provider.displayName} auth. If not, open the URL in ${fileHint} (do not copy a wrapped/spaced URL from the terminal). If redirect_uri fails, add the exact callback URI listed in that file to your OAuth app.`,
          },
          resume: { verifier, clientId, clientSecret, state },
        };
      },
      async completeAuthorization({ principal, callbackUrl, resume, callback }) {
        if (!resume) {
          throw new ConnectionAuthorizationFailedError(provider.name, {
            reason: "missing_resume_state",
            retryable: true,
          });
        }
        if (callback.params.error) {
          const accessDenied = callback.params.error === "access_denied";
          throw new ConnectionAuthorizationFailedError(provider.name, {
            reason: accessDenied ? "access_denied" : "authorization_failed",
            retryable: !accessDenied,
          });
        }
        if (!verifyOAuthState(resume.state, callback.params.state)) {
          throw new ConnectionAuthorizationFailedError(provider.name, {
            reason: "invalid_state",
            retryable: true,
          });
        }
        const code = callback.params.code;
        if (!code) {
          throw new ConnectionAuthorizationFailedError(provider.name, {
            reason: "missing_code",
            retryable: true,
          });
        }

        const existing = await getStoredAccessToken(provider, principal);
        if (existing) {
          return { token: existing.token, expiresAt: existing.expiresAt };
        }

        try {
          const token = await exchangeAuthorizationCode(provider, {
            callbackUrl,
            code,
            codeVerifier: resume.verifier,
            clientId: resume.clientId,
            clientSecret: resume.clientSecret,
          });
          await storeAccessToken(provider, principal, token);
          return {
            token: token.accessToken,
            expiresAt: token.expiresAt,
          };
        } catch {
          const raced = await getStoredAccessToken(provider, principal);
          if (raced) {
            return { token: raced.token, expiresAt: raced.expiresAt };
          }
          throw new ConnectionAuthorizationFailedError(provider.name, {
            reason: "token_exchange_failed",
            retryable: true,
          });
        }
      },
    }),
    approval: ({ toolName }) =>
      approvalForTool(provider.name, provider.safeReadOnlyTools, toolName, turnChatMode.get()),
  });
}
