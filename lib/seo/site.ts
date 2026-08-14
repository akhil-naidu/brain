import packageJson from "../../package.json" with { type: "json" };
import { readConfiguredPublicOrigin } from "@/lib/http/public-origin";

export const SITE_NAME = "Brain";

/** Public product stage shown next to the wordmark (home, chrome, social). */
export const SITE_STAGE = "Beta";

/** Semver from package.json — keep the Beta badge in sync with pre-1.0 releases. */
export const SITE_VERSION = packageJson.version;

export const SITE_DESCRIPTION =
  "Self-hosted private work assistant: browser chat, live MCP tools, models you choose (including Azure AI Foundry), and history on your Postgres.";

export const SITE_TAGLINE =
  "Private client, live tools, your models — self-hosted browser chat that is not a RAG copy of your apps.";

/** Matches LICENSE / README copyright line. */
export const SITE_COPYRIGHT_YEAR = 2026;
export const SITE_COPYRIGHT_HOLDER = "Akhil Naidu";
export const SITE_LICENSE_NAME = "MIT";
export const SITE_LICENSE_HREF = "https://github.com/akhil-naidu/brain/blob/main/LICENSE";

/** Public paths that may be indexed besides generated /docs pages. */
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
