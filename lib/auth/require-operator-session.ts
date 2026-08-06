import { NextResponse } from "next/server";
import { resolveOperatorUserId } from "@/lib/auth/operator";
import { requireSessionUserId } from "@/lib/auth/require-session";

export function isOperatorUserId(
  userId: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const operatorId = resolveOperatorUserId(env);
  return Boolean(operatorId && operatorId === userId);
}

/**
 * Require a signed-in session whose user is the host operator
 * (`BRAIN_OPERATOR_USER_ID` or first auth user).
 */
export async function requireOperatorSession(
  env: Record<string, string | undefined> = process.env,
): Promise<
  | { readonly ok: true; readonly userId: string }
  | { readonly ok: false; readonly response: NextResponse }
> {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session;
  }

  const operatorId = resolveOperatorUserId(env);
  if (!operatorId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "No Brain operator user. Bootstrap an account or set BRAIN_OPERATOR_USER_ID before configuring connections.",
        },
        { status: 503 },
      ),
    };
  }

  if (session.userId !== operatorId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Only the host operator can change connection app credentials." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, userId: session.userId };
}
