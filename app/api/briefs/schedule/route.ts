import { NextResponse } from "next/server";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import {
  isScheduledBriefDue,
  readScheduledBriefConfig,
  updateScheduledBriefBodySchema,
  writeScheduledBriefConfig,
} from "@/lib/chat/scheduled-brief";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    return auth.response;
  }
  const config = await readScheduledBriefConfig(auth.session.workspaceId, auth.session.userId);
  return NextResponse.json({
    schedule: config,
    due: isScheduledBriefDue(config),
  });
}

export async function PUT(request: Request) {
  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    return auth.response;
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
    const schedule = await writeScheduledBriefConfig(
      auth.session.workspaceId,
      auth.session.userId,
      parsed.data,
    );
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
