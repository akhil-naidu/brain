export function resolveEveHttpHost(env: Record<string, string | undefined> = process.env): string {
  const configured = env["EVE_BASE_URL"]?.trim() || env["BRAIN_EVE_URL"]?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const evePort = env["EVE_NEXT_PRODUCTION_PORT"]?.trim() || "4274";
  if (env["NODE_ENV"] === "production") {
    return `http://127.0.0.1:${evePort}`;
  }

  const nextPort = env["PORT"]?.trim() || "3000";
  return `http://127.0.0.1:${nextPort}`;
}
