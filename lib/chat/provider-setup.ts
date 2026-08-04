export const COMMAND_CODE_API_KEY_ENV = "COMMAND_CODE_API_KEY";

export const MISSING_COMMAND_CODE_API_KEY_MESSAGE =
  "Set COMMAND_CODE_API_KEY in your project .env (see .env.example), then restart pnpm dev.";

export const MISSING_COMMAND_CODE_API_KEY_COMPOSER_REASON =
  "Add COMMAND_CODE_API_KEY to .env and restart the dev server to chat.";

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
