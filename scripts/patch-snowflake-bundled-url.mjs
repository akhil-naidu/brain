/**
 * Production Snowflake MCP URL patcher.
 *
 * eve bakes `defineMcpClientConnection({ url })` into the Nitro bundle at
 * `eve build` time (`compiled-artifacts-bootstrap.mjs`). Production always
 * loads that bundled manifest — restarting eve after Set up does not re-read
 * `.eve` credentials for the URL.
 *
 * This script rewrites the snowflake connection `url` inside `.output` from
 * stored credentials or `SNOWFLAKE_MCP_URL`, then eve can be (re)started.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

export const SNOWFLAKE_PLACEHOLDER_MCP_URL =
  "https://org-account.snowflakecomputing.com/api/v2/databases/EXAMPLE/schemas/EXAMPLE/mcp-servers/EXAMPLE";

/**
 * @param {string} appRoot
 * @returns {string | null}
 */
export function resolveSnowflakeMcpUrlForPatch(appRoot = process.cwd()) {
  const fromEnv = process.env.SNOWFLAKE_MCP_URL?.trim();
  if (fromEnv && URL.canParse(fromEnv)) {
    return fromEnv;
  }

  const credentialsPath = join(appRoot, ".eve", "mcp-app-credentials-snowflake.json");
  if (!existsSync(credentialsPath)) {
    return null;
  }
  try {
    const parsed = JSON.parse(readFileSync(credentialsPath, "utf8"));
    const mcpUrl = typeof parsed?.mcpUrl === "string" ? parsed.mcpUrl.trim() : "";
    if (mcpUrl && URL.canParse(mcpUrl)) {
      return mcpUrl;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * @param {string} source
 * @param {string} mcpUrl
 * @returns {string}
 */
export function replaceSnowflakeUrlInBundledSource(source, mcpUrl) {
  const escaped = JSON.stringify(mcpUrl).slice(1, -1);
  const patterns = [
    /("connectionName"\s*:\s*"snowflake"[\s\S]*?"url"\s*:\s*")([^"]+)(")/,
    /(connectionName\s*:\s*"snowflake"[\s\S]*?url\s*:\s*")([^"]+)(")/,
  ];
  for (const pattern of patterns) {
    if (pattern.test(source)) {
      return source.replace(pattern, `$1${escaped}$3`);
    }
  }
  // Fallback: unique placeholder used by Brain's snowflake connection.
  if (source.includes(SNOWFLAKE_PLACEHOLDER_MCP_URL)) {
    return source.split(SNOWFLAKE_PLACEHOLDER_MCP_URL).join(mcpUrl);
  }
  return source;
}

/**
 * @param {string} directory
 * @param {(filePath: string) => boolean} predicate
 * @param {string[]} [acc]
 * @returns {string[]}
 */
function walkFiles(directory, predicate, acc = []) {
  if (!existsSync(directory)) {
    return acc;
  }
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    let stats;
    try {
      stats = statSync(fullPath);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      walkFiles(fullPath, predicate, acc);
    } else if (stats.isFile() && predicate(fullPath)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

/**
 * @param {string} [appRoot]
 * @returns {{ ok: true, mcpUrl: string, patchedFiles: string[] } | { ok: false, reason: string }}
 */
export function patchSnowflakeBundledMcpUrl(appRoot = process.cwd()) {
  const mcpUrl = resolveSnowflakeMcpUrlForPatch(appRoot);
  if (!mcpUrl) {
    return {
      ok: false,
      reason:
        "No Snowflake MCP URL in SNOWFLAKE_MCP_URL or .eve/mcp-app-credentials-snowflake.json",
    };
  }
  if (mcpUrl === SNOWFLAKE_PLACEHOLDER_MCP_URL) {
    return { ok: false, reason: "Snowflake MCP URL is still the placeholder" };
  }

  const outputDir = join(appRoot, ".output");
  if (!existsSync(outputDir)) {
    return { ok: false, reason: `Missing ${outputDir}; run eve build first` };
  }

  const candidates = walkFiles(
    outputDir,
    (filePath) =>
      filePath.endsWith(".mjs") || filePath.endsWith(".js") || filePath.endsWith(".json"),
  );

  /** @type {string[]} */
  const patchedFiles = [];
  for (const filePath of candidates) {
    let source;
    try {
      source = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }
    const looksRelevant =
      source.includes("connectionName") &&
      source.includes("snowflake") &&
      (source.includes('"url"') ||
        source.includes("url:") ||
        source.includes(SNOWFLAKE_PLACEHOLDER_MCP_URL));
    if (!looksRelevant) {
      continue;
    }
    const next = replaceSnowflakeUrlInBundledSource(source, mcpUrl);
    if (next !== source) {
      writeFileSync(filePath, next, "utf8");
      patchedFiles.push(relative(appRoot, filePath));
    }
  }

  if (patchedFiles.length === 0) {
    return {
      ok: false,
      reason: "No bundled Snowflake connection URL found under .output to patch",
    };
  }

  return { ok: true, mcpUrl, patchedFiles };
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("patch-snowflake-bundled-url.mjs") ||
    process.argv[1].endsWith("patch-snowflake-bundled-url.js"));

if (isMain) {
  const result = patchSnowflakeBundledMcpUrl();
  if (!result.ok) {
    console.warn(`[patch-snowflake-bundled-url] skipped: ${result.reason}`);
    process.exit(0);
  }
  console.log(
    `[patch-snowflake-bundled-url] patched ${result.patchedFiles.length} file(s) → ${result.mcpUrl}`,
  );
  for (const file of result.patchedFiles) {
    console.log(`  - ${file}`);
  }
}
