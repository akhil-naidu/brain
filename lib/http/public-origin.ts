const PUBLIC_ORIGIN_ENV_KEYS = ["BRAIN_PUBLIC_URL", "BRAIN_PUBLIC_ORIGIN"] as const;

function firstHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const first = value.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

function originFromAbsoluteUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function isValidHost(host: string): boolean {
  if (host.includes("/") || /\s/.test(host)) {
    return false;
  }
  try {
    return new URL(`http://${host}`).host.length > 0;
  } catch {
    return false;
  }
}

/** Explicit deploy override (no trailing path required). */
export function readConfiguredPublicOrigin(env: NodeJS.ProcessEnv = process.env): string | null {
  for (const key of PUBLIC_ORIGIN_ENV_KEYS) {
    const raw = env[key]?.trim();
    if (!raw) {
      continue;
    }
    const origin = originFromAbsoluteUrl(raw);
    if (origin) {
      return origin;
    }
  }
  return null;
}

export type PublicOriginRequest = {
  readonly url: string;
  readonly headers: {
    get(name: string): string | null;
  };
};

/**
 * Prefer the browser Origin/Referer from same-origin Menu Connect fetches, then
 * reverse-proxy forwarded headers, then Host, then the internal request URL.
 */
export function resolvePublicOrigin(
  request: PublicOriginRequest,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configured = readConfiguredPublicOrigin(env);
  if (configured) {
    return configured;
  }

  const fromOrigin = originFromAbsoluteUrl(request.headers.get("origin") ?? "");
  if (fromOrigin) {
    return fromOrigin;
  }

  const fromReferer = originFromAbsoluteUrl(request.headers.get("referer") ?? "");
  if (fromReferer) {
    return fromReferer;
  }

  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost ?? firstHeaderValue(request.headers.get("host"));
  if (host && isValidHost(host)) {
    const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
    const requestProto = new URL(request.url).protocol === "https:" ? "https" : "http";
    const proto =
      forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : requestProto;
    const fromHost = originFromAbsoluteUrl(`${proto}://${host}`);
    if (fromHost) {
      return fromHost;
    }
  }

  return new URL(request.url).origin;
}
