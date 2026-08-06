import { NextResponse } from "next/server";
import { requireSessionUserId } from "@/lib/auth/require-session";
import {
  isScheduledBriefDue,
  readScheduledBriefConfig,
  updateScheduledBriefBodySchema,
  writeScheduledBriefConfig,
} from "@/lib/chat/scheduled-brief";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  const config = await readScheduledBriefConfig(session.userId);
  return NextResponse.json({
    schedule: config,
    due: isScheduledBriefDue(config),
  });
}

export async function PUT(request: Request) {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = updateScheduledBriefBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const schedule = await writeScheduledBriefConfig(session.userId, parsed.data);
    return NextResponse.json({
      schedule,
      due: isScheduledBriefDue(schedule),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save schedule." },
      { status: 400 },
    );
  }
}
