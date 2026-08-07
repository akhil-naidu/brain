import { NextResponse } from "next/server";
import { resolveOperatorUserId } from "@/lib/auth/operator";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

export async function isOperatorUserId(
  userId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  const configured = env["BRAIN_OPERATOR_USER_ID"]?.trim();
  if (configured) {
    return configured === userId;
  }
  try {
    if (await getWorkspaceStore(env).isInstanceAdmin(userId)) {
      return true;
    }
  } catch {
    // Auth DB may not be ready in some unit tests.
  }
  const operatorId = await resolveOperatorUserId(env);
  return Boolean(operatorId && operatorId === userId);
}

/**
 * Require a signed-in session whose user is the instance admin / host operator
 * (instance admin flag, `BRAIN_OPERATOR_USER_ID`, or first auth user).
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

  await ensureAuthReady(env);
  if (await isOperatorUserId(session.userId, env)) {
    return { ok: true, userId: session.userId };
  }

  const operatorId = await resolveOperatorUserId(env);
  if (!operatorId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "No Brain instance admin. Bootstrap an account or set BRAIN_OPERATOR_USER_ID before configuring connections.",
        },
        { status: 503 },
      ),
    };
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: "Only the instance admin can change connection app credentials." },
      { status: 403 },
    ),
  };
}
