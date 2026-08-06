import { firstAuthUserId } from "@/lib/auth/server";

/** Resolves the host operator user id for scheduled jobs. */
export function resolveOperatorUserId(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const configured = env["BRAIN_OPERATOR_USER_ID"]?.trim();
  if (configured) {
    return configured;
  }
  return firstAuthUserId(env);
}

export function requireOperatorUserId(
  env: Record<string, string | undefined> = process.env,
): string {
  const userId = resolveOperatorUserId(env);
  if (!userId) {
    throw new Error("No Brain operator user. Bootstrap an account or set BRAIN_OPERATOR_USER_ID.");
  }
  return userId;
}

export function resolveInternalOperatorToken(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const token = env["BRAIN_INTERNAL_TOKEN"]?.trim();
  return token && token.length > 0 ? token : null;
}
