import {
  ConnectionAuthorizationFailedError,
  ConnectionAuthorizationRequiredError,
  defineInteractiveAuthorization,
  defineMcpClientConnection,
} from "eve/connections";
import { randomBytes } from "node:crypto";
import {
  buildAuthorizeUrl,
  CLICKUP_MCP_URL,
  exchangeAuthorizationCode,
  getStoredAccessToken,
  makePkce,
  publishAuthorizeUrl,
  storeAccessToken,
} from "../lib/clickup-mcp-oauth";

type ClickUpOAuthResume = {
  verifier: string;
  clientId: string;
  state: string;
};

const WRITE_TOOL_HINT =
  /(create|update|edit|post|send|add|set|write|comment|assign|move|complete|start|stop|log)/i;

export default defineMcpClientConnection({
  url: CLICKUP_MCP_URL,
  description:
    "ClickUp workspace via official MCP: tasks, docs, chat/channels, threads, comments, and reporting. Use for searching work and creating tickets.",
  auth: defineInteractiveAuthorization<ClickUpOAuthResume>({
    async getToken({ principal }) {
      const cached = await getStoredAccessToken(principal);
      if (!cached) {
        throw new ConnectionAuthorizationRequiredError("clickup");
      }
      return { token: cached.token, expiresAt: cached.expiresAt };
    },
    async startAuthorization({ callbackUrl }) {
      const { verifier, challenge } = makePkce();
      const state = randomBytes(16).toString("base64url");
      const { url, clientId } = await buildAuthorizeUrl({
        callbackUrl,
        codeChallenge: challenge,
        state,
      });
      // TUI soft-wrap can insert spaces into long URLs and break OAuth params.
      await publishAuthorizeUrl(url);
      return {
        challenge: {
          url,
          displayName: "ClickUp",
          instructions:
            "A browser should open for ClickUp auth. If not, open the single-line URL in .eve/clickup-authorize-url.txt (do not copy a wrapped/spaced URL from the terminal).",
        },
        resume: { verifier, clientId, state },
      };
    },
    async completeAuthorization({ principal, callbackUrl, resume, callback }) {
      // Idempotent: eve may re-run completion after a successful callback.
      // Auth codes are single-use, so prefer an already-stored token.
      const existing = await getStoredAccessToken(principal);
      if (existing) {
        return { token: existing.token, expiresAt: existing.expiresAt };
      }

      if (!resume) {
        throw new ConnectionAuthorizationFailedError("clickup", {
          reason: "missing_resume_state",
          retryable: true,
        });
      }
      if (callback.params.error) {
        throw new ConnectionAuthorizationFailedError("clickup", {
          reason: callback.params.error,
          retryable: callback.params.error !== "access_denied",
        });
      }
      if (
        callback.params.state &&
        resume.state &&
        callback.params.state !== resume.state
      ) {
        throw new ConnectionAuthorizationFailedError("clickup", {
          reason: "invalid_state",
          retryable: true,
        });
      }
      const code = callback.params.code;
      if (!code) {
        throw new ConnectionAuthorizationFailedError("clickup", {
          reason: "missing_code",
          retryable: true,
        });
      }

      try {
        const token = await exchangeAuthorizationCode({
          callbackUrl,
          code,
          codeVerifier: resume.verifier,
          clientId: resume.clientId,
        });
        await storeAccessToken(principal, token);
        return {
          token: token.accessToken,
          expiresAt: token.expiresAt,
        };
      } catch (error) {
        const raced = await getStoredAccessToken(principal);
        if (raced) {
          return { token: raced.token, expiresAt: raced.expiresAt };
        }
        const message =
          error instanceof Error ? error.message : "token_exchange_failed";
        throw new ConnectionAuthorizationFailedError("clickup", {
          reason: message,
          retryable: true,
        });
      }
    },
  }),
  approval: ({ toolName }) =>
    WRITE_TOOL_HINT.test(toolName) ? "user-approval" : "not-applicable",
});
