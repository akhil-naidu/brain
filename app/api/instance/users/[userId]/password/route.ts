import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSetUserPassword } from "@/lib/auth/admin-set-password";
import { isOperatorUserId } from "@/lib/auth/require-operator-session";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { ensureAuthReady, getAuth } from "@/lib/auth/server";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    newPassword: z.string().min(8).max(128),
  })
  .strict();

export async function POST(
  request: Request,
  context: { readonly params: Promise<{ readonly userId: string }> },
) {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  await ensureAuthReady();
  if (!isOperatorUserId(session.userId)) {
    return NextResponse.json(
      { error: "Only the instance admin can reset user passwords." },
      { status: 403 },
    );
  }

  const { userId } = await context.params;
  if (!userId?.trim()) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Password must be between 8 and 128 characters." },
      { status: 400 },
    );
  }

  const result = await adminSetUserPassword(getAuth(), {
    userId: userId.trim(),
    newPassword: parsed.data.newPassword,
  });
  if (!result.ok) {
    const status = result.reason === "User not found." ? 404 : 400;
    return NextResponse.json({ error: result.reason }, { status });
  }

  return NextResponse.json({
    ok: true,
    message: "Password updated. All sessions for that user were signed out.",
  });
}
