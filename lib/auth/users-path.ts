import path from "node:path";

export const DEFAULT_AUTH_DB_PATH = path.join(".eve", "brain-auth.sqlite");

export function resolveAuthDbPath(
  env: Record<string, string | undefined> = process.env,
  cwd: string = process.cwd(),
): string {
  const configured = env["BRAIN_AUTH_DB_PATH"]?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(cwd, configured);
  }
  return path.resolve(cwd, DEFAULT_AUTH_DB_PATH);
}
