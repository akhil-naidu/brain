import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveForgotPasswordAvailability } from "@/lib/auth/forgot-password-availability";
import { ensureAuthReady, getAuth, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

function publicBaseUrl(env: Record<string, string | undefined> = process.env): string {
  return (
    env["BETTER_AUTH_URL"]?.trim() || env["BRAIN_PUBLIC_URL"]?.trim() || "http://localhost:3000"
  );
}

/**
 * Brain-gated forgot-password entrypoint. Checks instance policy + SMTP before
 * delegating to Better Auth so the UI can show clear errors without email enumeration
 * on successful requests.
 */
export async function POST(request: Request) {
  await ensureAuthReady();
  const policies = getWorkspaceStore().getPolicies();
  const availability = resolveForgotPasswordAvailability(policies);

  if (!availability.allowForgotPassword) {
    return NextResponse.json(
      { error: "Forgot password is disabled on this host. Ask an instance admin for a reset." },
      { status: 403 },
    );
  }
  if (policies.signupMode === "sso-only") {
    return NextResponse.json(
      { error: "Password reset is not available when this host is SSO-only." },
      { status: 403 },
    );
  }
  if (!availability.smtpConfigured) {
    return NextResponse.json(
      {
        error:
          "Password reset email is not configured on this host. Ask an instance admin to reset your password or configure SMTP.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const redirectTo = `${publicBaseUrl()}/reset-password`;

  try {
    await getAuth().api.requestPasswordReset({
      body: {
        email,
        redirectTo,
      },
      headers: request.headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to request password reset.";
    if (/disabled|forbidden|not available|sso-only/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    // Prefer a generic success-shaped response for unknown failures that might
    // otherwise leak account existence through differing status codes.
  }

  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, a reset link was sent.",
  });
}
