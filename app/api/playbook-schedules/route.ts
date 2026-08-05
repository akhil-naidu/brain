import { NextResponse } from "next/server";
import {
  createScheduledPlaybook,
  createScheduledPlaybookBodySchema,
  readScheduledPlaybooks,
} from "@/lib/chat/scheduled-playbooks";

export const runtime = "nodejs";

export async function GET() {
  const schedules = await readScheduledPlaybooks();
  return NextResponse.json({ schedules });
}

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = createScheduledPlaybookBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const schedule = await createScheduledPlaybook(parsed.data);
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create schedule." },
      { status: 400 },
    );
  }
}
