export const COMMAND_CODE_API_KEY_ENV = "COMMAND_CODE_API_KEY";

/** Empty-state / composer copy when nothing is configured for chat. */
export const MISSING_COMMAND_CODE_API_KEY_MESSAGE =
  "Chat isn't available on this Brain instance yet. Ask whoever set it up to finish configuration.";

export const MISSING_COMMAND_CODE_API_KEY_TITLE = "Chat isn't available";

export const MISSING_COMMAND_CODE_API_KEY_COMPOSER_REASON = "Chat isn't available yet.";

/** Turn-time auth failures for a selected model (not the host empty-state). */
export const PROVIDER_CREDENTIAL_FAILURE_TITLE = "Model authentication failed";

export const PROVIDER_CREDENTIAL_FAILURE_MESSAGE =
  "This model rejected the request. Check its API key in Models, or try another model.";

const AUTH_ERROR_PATTERN =
  /api[_ ]?key|unauthorized|invalid.?api.?key|authentication|401\b|forbidden|missing.+credential|no api key|could not load an api key/i;

const OPERATOR_LEAK_PATTERN =
  /\b(COMMAND_CODE_API_KEY|AI_GATEWAY_API_KEY|OPENAI_API_KEY|BETTER_AUTH_SECRET|\.env(?:\.local)?)\b/gi;

export type FormattedProviderError = {
  readonly title: string;
  readonly message: string;
};

export function isCommandCodeApiKeyConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env[COMMAND_CODE_API_KEY_ENV]?.trim());
}

export function looksLikeProviderAuthError(message: string): boolean {
  return AUTH_ERROR_PATTERN.test(message);
}

/** Strip operator env / file hints from provider text shown to end users. */
export function sanitizeProviderErrorMessage(message: string): string {
  if (OPERATOR_LEAK_PATTERN.test(message)) {
    OPERATOR_LEAK_PATTERN.lastIndex = 0;
    return "Something went wrong with this request.";
  }
  const trimmed = message.trim();
  return trimmed.length > 0 ? trimmed : "Something went wrong with this request.";
}

/**
 * Map a raw provider/agent error into toast copy.
 * Host empty-state (“Chat isn't available…”) is only for setup status — not turn failures.
 */
export function formatProviderError(message: string): FormattedProviderError {
  const trimmed = message.trim();
  if (!trimmed) {
    return {
      title: "Request failed",
      message: "Something went wrong with this request.",
    };
  }
  if (trimmed === MISSING_COMMAND_CODE_API_KEY_MESSAGE) {
    return {
      title: MISSING_COMMAND_CODE_API_KEY_TITLE,
      message: MISSING_COMMAND_CODE_API_KEY_MESSAGE,
    };
  }
  if (looksLikeProviderAuthError(trimmed)) {
    return {
      title: PROVIDER_CREDENTIAL_FAILURE_TITLE,
      message: PROVIDER_CREDENTIAL_FAILURE_MESSAGE,
    };
  }
  return {
    title: "Request failed",
    message: sanitizeProviderErrorMessage(trimmed),
  };
}

/** @deprecated Prefer formatProviderError for title + body. */
export function formatProviderErrorMessage(message: string): string {
  return formatProviderError(message).message;
}
