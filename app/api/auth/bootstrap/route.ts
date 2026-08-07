import { NextResponse } from "next/server";
import { z } from "zod";
import { bootstrapFirstUser, isBootstrapAllowed, verifyBootstrapToken } from "@/lib/auth/bootstrap";
import {
  DISPLAY_NAME_MAX_LENGTH,
  displayNameErrorMessage,
  parseDisplayName,
} from "@/lib/auth/display-name";
import { ensureAuthReady } from "@/lib/auth/server";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(DISPLAY_NAME_MAX_LENGTH + 8),
    email: z.string().email(),
    password: z.string().min(8),
    bootstrapToken: z.string().optional(),
  })
  .strict();

export async function GET() {
  await ensureAuthReady();
  return NextResponse.json({
    allowed: await isBootstrapAllowed(),
    requiresToken: Boolean(process.env["BRAIN_BOOTSTRAP_TOKEN"]?.trim()),
  });
}

export async function POST(request: Request) {
  await ensureAuthReady();
  if (!(await isBootstrapAllowed())) {
    return NextResponse.json(
      { error: "Bootstrap is disabled because a user already exists." },
      { status: 403 },
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
    return NextResponse.json(
      {
        error: "Provide a name, a valid email, and a password of at least 8 characters.",
      },
      { status: 400 },
    );
  }
  if (!parseDisplayName(parsed.data.name)) {
    return NextResponse.json({ error: displayNameErrorMessage() }, { status: 400 });
  }

  if (!verifyBootstrapToken(parsed.data.bootstrapToken)) {
    return NextResponse.json({ error: "Invalid bootstrap token." }, { status: 403 });
  }

  try {
    const user = await bootstrapFirstUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    });
    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
