/**
 * Resolve the Postgres connection URL for Brain.
 * Prefers BRAIN_DATABASE_URL; accepts DATABASE_URL as an alias.
 */
export function resolveDatabaseUrl(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string | null {
  const brain = env["BRAIN_DATABASE_URL"]?.trim();
  if (brain) {
    return brain;
  }
  const generic = env["DATABASE_URL"]?.trim();
  if (generic) {
    return generic;
  }
  return null;
}

export function requireDatabaseUrl(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  const url = resolveDatabaseUrl(env);
  if (url) {
    return url;
  }
  throw new Error(
    "Missing BRAIN_DATABASE_URL (or DATABASE_URL). Start Postgres (e.g. docker compose up -d db) and set the connection URL.",
  );
}
