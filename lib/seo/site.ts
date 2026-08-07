import packageJson from "../../package.json" with { type: "json" };
import { readConfiguredPublicOrigin } from "@/lib/http/public-origin";

export const SITE_NAME = "Brain";

/** Public product stage shown next to the wordmark (home, chrome, social). */
export const SITE_STAGE = "Beta";

/** Semver from package.json — keep the Beta badge in sync with pre-1.0 releases. */
export const SITE_VERSION = packageJson.version;

export const SITE_DESCRIPTION =
  "Self-hosted work assistant with browser chat, MCP connections, and local history on your host.";

export const SITE_TAGLINE =
  "Self-hosted work assistant: browser chat, MCP connections, model picker, and local history.";

/** Public paths that may be indexed. Everything else should stay out of sitemaps. */
export const PUBLIC_INDEXABLE_PATHS = ["/"] as const;

/**
 * Absolute site origin for metadataBase, canonical URLs, sitemap, and robots.
 * Prefers BRAIN_PUBLIC_URL / BRAIN_PUBLIC_ORIGIN; falls back to localhost for local/dev.
 */
export function getSiteUrl(env: NodeJS.ProcessEnv = process.env): URL {
  const configured = readConfiguredPublicOrigin(env);
  return new URL(configured ?? "http://localhost:3000");
}

export function absoluteUrl(pathname: string, env: NodeJS.ProcessEnv = process.env): string {
  const base = getSiteUrl(env);
  if (!pathname || pathname === "/") {
    return base.origin;
  }
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(path, base).toString();
}
