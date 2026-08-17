import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteSlackInboundCredentials,
  slackInboundCredentialStatus,
  writeSlackInboundCredentials,
} from "@/agent/lib/slack-inbound-credentials";
import { isOperatorUserId, requireOperatorSession } from "@/lib/auth/require-operator-session";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { resolvePublicOrigin } from "@/lib/http/public-origin";

export const runtime = "nodejs";

const putBodySchema = z
  .object({
    botToken: z.string().optional(),
    signingSecret: z.string().optional(),
  })
  .strict();

export async function GET(request: Request) {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  const canManage = await isOperatorUserId(session.userId);
  if (!canManage) {
    return NextResponse.json({ canManage: false });
  }
  const status = await slackInboundCredentialStatus();
  const origin = resolvePublicOrigin(request);
  return NextResponse.json({
    canManage: true,
    hasBotToken: status.hasBotToken,
    hasSigningSecret: status.hasSigningSecret,
    source: status.source,
    eventUrl: `${origin}/eve/v1/slack`,
  });
}

export async function PUT(request: Request) {
  const session = await requireOperatorSession();
  if (!session.ok) {
    return session.response;
  }
  const parsed = putBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bot token or signing secret is required." },
      { status: 400 },
    );
  }
  const botToken = parsed.data.botToken?.trim();
  const signingSecret = parsed.data.signingSecret?.trim();
  if (!botToken && !signingSecret) {
    return NextResponse.json(
      { error: "Bot token or signing secret is required." },
      { status: 400 },
    );
  }
  await writeSlackInboundCredentials({ botToken, signingSecret });
  const status = await slackInboundCredentialStatus();
  return NextResponse.json({
    ok: true,
    hasBotToken: status.hasBotToken,
    hasSigningSecret: status.hasSigningSecret,
    source: status.source,
  });
}

export async function DELETE() {
  const session = await requireOperatorSession();
  if (!session.ok) {
    return session.response;
  }
  await deleteSlackInboundCredentials();
  return NextResponse.json({ ok: true });
}
