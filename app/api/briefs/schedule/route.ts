import { NextResponse } from "next/server";
import {
  isScheduledBriefDue,
  readScheduledBriefConfig,
  updateScheduledBriefBodySchema,
  writeScheduledBriefConfig,
} from "@/lib/chat/scheduled-brief";

export const runtime = "nodejs";

export async function GET() {
  const config = await readScheduledBriefConfig();
  return NextResponse.json({
    schedule: config,
    due: isScheduledBriefDue(config),
  });
}

export async function PUT(request: Request) {
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
    const schedule = await writeScheduledBriefConfig(parsed.data);
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
