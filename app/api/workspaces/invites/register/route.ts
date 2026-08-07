import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DISPLAY_NAME_MAX_LENGTH,
  displayNameErrorMessage,
  parseDisplayName,
} from "@/lib/auth/display-name";
import { registerWithInvite } from "@/lib/auth/invite-register";
import { ensureAuthReady } from "@/lib/auth/server";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    token: z.string().trim().min(1),
    name: z
      .string()
      .min(1)
      .max(DISPLAY_NAME_MAX_LENGTH + 8),
    email: z.string().email(),
    password: z.string().min(8),
  })
  .strict();

export async function POST(request: Request) {
  await ensureAuthReady();
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
        error:
          "Provide invite token, a name, a valid email, and a password of at least 8 characters.",
      },
      { status: 400 },
    );
  }
  if (!parseDisplayName(parsed.data.name)) {
    return NextResponse.json({ error: displayNameErrorMessage() }, { status: 400 });
  }

  try {
    const user = await registerWithInvite(parsed.data);
    return NextResponse.json(
      {
        user: { id: user.id, email: user.email, name: user.name },
        workspace: { id: user.workspaceId, name: user.workspaceName },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to register with invite.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
