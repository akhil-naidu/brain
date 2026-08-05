import { NextResponse } from "next/server";
import {
  hostCronExample,
  isScheduledBriefDue,
  readScheduledBriefConfig,
  updateScheduledBriefBodySchema,
  writeScheduledBriefConfig,
} from "@/lib/chat/scheduled-brief";

export const runtime = "nodejs";

function publicOrigin(request: Request): string {
  const configured = process.env.BRAIN_PUBLIC_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const config = await readScheduledBriefConfig();
  const origin = publicOrigin(request);
  return NextResponse.json({
    schedule: config,
    due: isScheduledBriefDue(config),
    hostCron: hostCronExample(config, origin),
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
    const origin = publicOrigin(request);
    return NextResponse.json({
      schedule,
      due: isScheduledBriefDue(schedule),
      hostCron: hostCronExample(schedule, origin),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save schedule." },
      { status: 400 },
    );
  }
}
