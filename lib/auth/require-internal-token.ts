import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { resolveInternalOperatorToken } from "@/lib/auth/operator";

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

/**
 * Require `Authorization: Bearer <BRAIN_INTERNAL_TOKEN>` for host cron / due sweeps.
 */
export function requireInternalBearer(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): { readonly ok: true } | { readonly ok: false; readonly response: NextResponse } {
  const expected = resolveInternalOperatorToken(env);
  if (!expected) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "BRAIN_INTERNAL_TOKEN is not configured." },
        { status: 503 },
      ),
    };
  }

  const bearer = extractBearer(request.headers.get("authorization"));
  if (!bearer || !secretsEqual(bearer, expected)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  return { ok: true };
}
