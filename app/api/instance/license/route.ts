import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearStoredLicenseKey,
  resolveLicenseEntitlements,
  verifyLicenseKey,
  writeStoredLicenseKey,
} from "@/lib/auth/license";
import { isOperatorUserId } from "@/lib/auth/require-operator-session";
import { requireSessionUserId } from "@/lib/auth/require-session";

export const runtime = "nodejs";

const putSchema = z
  .object({
    key: z.string().trim().min(1),
  })
  .strict();

export async function GET() {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  const entitlements = await resolveLicenseEntitlements();
  return NextResponse.json({
    entitlements,
    canManage: await isOperatorUserId(session.userId),
  });
}

export async function PUT(request: Request) {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  if (!(await isOperatorUserId(session.userId))) {
    return NextResponse.json(
      { error: "Only the instance admin can install a license." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "License key is required." }, { status: 400 });
  }

  try {
    verifyLicenseKey(parsed.data.key);
    await writeStoredLicenseKey(parsed.data.key);
    const entitlements = await resolveLicenseEntitlements();
    return NextResponse.json({ entitlements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid license key.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  if (!(await isOperatorUserId(session.userId))) {
    return NextResponse.json(
      { error: "Only the instance admin can clear the license." },
      { status: 403 },
    );
  }
  await clearStoredLicenseKey();
  const entitlements = await resolveLicenseEntitlements();
  return NextResponse.json({ entitlements });
}
