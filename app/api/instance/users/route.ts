import { NextResponse } from "next/server";
import { listInstanceUsers } from "@/lib/auth/list-instance-users";
import { isOperatorUserId } from "@/lib/auth/require-operator-session";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { ensureAuthReady } from "@/lib/auth/server";
import { getPool } from "@/lib/db/pool";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  await ensureAuthReady();
  if (!(await isOperatorUserId(session.userId))) {
    return NextResponse.json(
      { error: "Only the instance admin can list host users." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    users: await listInstanceUsers(getPool()),
  });
}
