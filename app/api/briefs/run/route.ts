import { NextResponse } from "next/server";
import { runScheduledBriefBodySchema } from "@/lib/chat/scheduled-brief";
import { runScheduledBrief } from "@/lib/chat/run-scheduled-brief";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = runScheduledBriefBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await runScheduledBrief({ force: parsed.data.force === true });
    if (result.skipped) {
      return NextResponse.json(result);
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to run morning brief.",
      },
      { status: 502 },
    );
  }
}
