import { NextResponse } from "next/server";
import { listInstanceUsers } from "@/lib/auth/list-instance-users";
import { isOperatorUserId } from "@/lib/auth/require-operator-session";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { ensureAuthReady, getAuthDb } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  await ensureAuthReady();
  if (!isOperatorUserId(session.userId)) {
    return NextResponse.json(
      { error: "Only the instance admin can list host users." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    users: listInstanceUsers(getAuthDb()),
  });
}
