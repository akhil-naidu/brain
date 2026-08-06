const DEFAULT_CALLBACK_URL = "/chat";

/**
 * Allow only same-origin relative paths for post-login redirects.
 * Rejects protocol-relative (`//evil.com`) and absolute URLs.
 */
export function safeCallbackUrl(
  value: string | null | undefined,
  fallback: string = DEFAULT_CALLBACK_URL,
): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) {
    return fallback;
  }
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }
  if (trimmed.includes("://") || trimmed.includes("\\")) {
    return fallback;
  }
  return trimmed;
}
