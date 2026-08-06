import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ensureAuthReady, getAuth } from "@/lib/auth/server";

export async function requireSessionUserId(): Promise<
  | { readonly ok: true; readonly userId: string }
  | { readonly ok: false; readonly response: NextResponse }
> {
  await ensureAuthReady();
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign in required." }, { status: 401 }),
    };
  }
  return { ok: true, userId };
}
