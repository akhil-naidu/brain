export const COMMAND_CODE_API_KEY_ENV = "COMMAND_CODE_API_KEY";

/** Empty-state / toast copy for end users (no operator env instructions). */
export const MISSING_COMMAND_CODE_API_KEY_MESSAGE =
  "Chat isn't available on this Brain instance yet. Ask whoever set it up to finish configuration.";

export const MISSING_COMMAND_CODE_API_KEY_TITLE = "Chat isn't available";

export const MISSING_COMMAND_CODE_API_KEY_COMPOSER_REASON = "Chat isn't available yet.";

const AUTH_ERROR_PATTERN =
  /api[_ ]?key|unauthorized|invalid.?api.?key|authentication|401\b|forbidden|missing.+credential|no api key/i;

export function isCommandCodeApiKeyConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env[COMMAND_CODE_API_KEY_ENV]?.trim());
}

export function looksLikeProviderAuthError(message: string): boolean {
  return AUTH_ERROR_PATTERN.test(message);
}

export function formatProviderErrorMessage(message: string): string {
  if (looksLikeProviderAuthError(message)) {
    return MISSING_COMMAND_CODE_API_KEY_MESSAGE;
  }
  return message;
}
