import { resolveInternalOperatorToken } from "@/lib/auth/operator";

/** Next origin used by eve minute schedules (not the Nitro PORT). */
export function internalBrainOrigin(env: Record<string, string | undefined> = process.env): string {
  const configured = env["BRAIN_INTERNAL_URL"]?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "http://127.0.0.1:3000";
}

/** Headers for cron → Next due-sweep POSTs. Returns null when the token is unset. */
export function internalScheduleFetchHeaders(
  env: Record<string, string | undefined> = process.env,
): { readonly "content-type": string; readonly authorization: string } | null {
  const token = resolveInternalOperatorToken(env);
  if (!token) {
    return null;
  }
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };
}
