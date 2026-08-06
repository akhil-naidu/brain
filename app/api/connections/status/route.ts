import { NextResponse } from "next/server";
import { listChatConnectionStatuses } from "@/agent/lib/connection-status";
import { brainUserPrincipal } from "@/lib/auth/principal";
import { requireSessionUserId } from "@/lib/auth/require-session";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  const connections = await listChatConnectionStatuses(brainUserPrincipal(session.userId));
  return NextResponse.json({ connections });
}
