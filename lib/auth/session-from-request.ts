import { timingSafeEqual } from "node:crypto";
import { resolveInternalOperatorToken, resolveOperatorUserId } from "@/lib/auth/operator";
import { sessionAuthContext } from "@/lib/auth/principal";
import { ensureAuthReady, getAuth } from "@/lib/auth/server";

function secretsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

function extractBearer(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export async function resolveBrainUserIdFromRequest(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): Promise<string | null> {
  const internal = resolveInternalOperatorToken(env);
  const bearer = extractBearer(request.headers.get("authorization"));
  if (internal && bearer && secretsEqual(bearer, internal)) {
    return resolveOperatorUserId(env);
  }

  await ensureAuthReady(env);
  const session = await getAuth(env).api.getSession({ headers: request.headers });
  const userId = session?.user?.id?.trim();
  return userId || null;
}

export async function resolveBrainSessionAuthFromRequest(
  request: Request,
  env: Record<string, string | undefined> = process.env,
) {
  const userId = await resolveBrainUserIdFromRequest(request, env);
  if (!userId) {
    return null;
  }
  return sessionAuthContext(userId);
}
