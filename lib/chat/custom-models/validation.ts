const MAX_LABEL = 120;
const MAX_DESCRIPTION = 500;
const MAX_PROVIDER_MODEL_ID = 256;
const MAX_BASE_URL = 2048;
const MIN_CONTEXT = 1_024;
const MAX_CONTEXT = 10_000_000;

export function normalizeCustomModelLabel(value: string): string {
  return value.trim().slice(0, MAX_LABEL);
}

export function normalizeCustomModelDescription(value: string | undefined): string {
  return (value ?? "").trim().slice(0, MAX_DESCRIPTION);
}

export function normalizeProviderModelId(value: string): string {
  return value.trim().slice(0, MAX_PROVIDER_MODEL_ID);
}

export function normalizeBaseUrl(value: string): string | null {
  const trimmed = value.trim().slice(0, MAX_BASE_URL);
  if (!trimmed) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }
  // Strip trailing slash for consistent storage; OpenAI SDK joins paths.
  return trimmed.replace(/\/+$/, "");
}

export function normalizeContextWindowTokens(value: number): number | null {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return null;
  }
  if (value < MIN_CONTEXT || value > MAX_CONTEXT) {
    return null;
  }
  return value;
}

export function normalizeOptionalApiKey(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
