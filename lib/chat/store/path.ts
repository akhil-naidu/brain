import path from "node:path";

export const DEFAULT_CHATS_DB_PATH = path.join(".eve", "brain-chats.sqlite");

export function resolveChatsDbPath(
  env: Record<string, string | undefined> = process.env,
  cwd: string = process.cwd(),
): string {
  const configured = env["BRAIN_CHATS_DB_PATH"]?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(cwd, configured);
  }
  return path.resolve(cwd, DEFAULT_CHATS_DB_PATH);
}
