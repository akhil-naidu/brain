export const DISPLAY_NAME_MAX_LENGTH = 80;

/**
 * Normalize a user-facing display name. Rejects empty / whitespace-only values
 * and names longer than {@link DISPLAY_NAME_MAX_LENGTH}.
 */
export function parseDisplayName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    return null;
  }
  return trimmed;
}

export function displayNameErrorMessage(): string {
  return `Enter a name between 1 and ${DISPLAY_NAME_MAX_LENGTH} characters.`;
}
