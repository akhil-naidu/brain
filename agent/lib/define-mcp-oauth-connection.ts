import {
  ConnectionAuthorizationFailedError,
  ConnectionAuthorizationRequiredError,
  defineInteractiveAuthorization,
  defineMcpClientConnection,
} from "eve/connections";
import { randomBytes } from "node:crypto";
import {
  authorizeUrlPath,
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
  getStoredAccessToken,
  makePkce,
  type McpOAuthProvider,
  publishAuthorizeUrl,
  storeAccessToken,
} from "./mcp-oauth";

export type McpOAuthResume = {
  verifier: string;
  clientId: string;
  clientSecret?: string;
  state: string;
};

const WRITE_TOOL_HINT =
  /(create|update|edit|post|send|add|set|write|comment|assign|move|complete|start|stop|log|delete|invite|schedule)/i;

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
      async startAuthorization({ callbackUrl }) {
        const { verifier, challenge } = makePkce();
        const state = randomBytes(16).toString("base64url");
        const { url, clientId, clientSecret } = await buildAuthorizeUrl(
          provider,
          {
            callbackUrl,
            codeChallenge: challenge,
            state,
          },
        );
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
        const existing = await getStoredAccessToken(provider, principal);
        if (existing) {
          return { token: existing.token, expiresAt: existing.expiresAt };
        }

        if (!resume) {
          throw new ConnectionAuthorizationFailedError(provider.name, {
            reason: "missing_resume_state",
            retryable: true,
          });
        }
        if (callback.params.error) {
          throw new ConnectionAuthorizationFailedError(provider.name, {
            reason: callback.params.error,
            retryable: callback.params.error !== "access_denied",
          });
        }
        if (
          callback.params.state &&
          resume.state &&
          callback.params.state !== resume.state
        ) {
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
        } catch (error) {
          const raced = await getStoredAccessToken(provider, principal);
          if (raced) {
            return { token: raced.token, expiresAt: raced.expiresAt };
          }
          const message =
            error instanceof Error ? error.message : "token_exchange_failed";
          throw new ConnectionAuthorizationFailedError(provider.name, {
            reason: message,
            retryable: true,
          });
        }
      },
    }),
    approval: ({ toolName }) =>
      WRITE_TOOL_HINT.test(toolName) ? "user-approval" : "not-applicable",
  });
}
