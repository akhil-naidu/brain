import { NextResponse } from "next/server";
import { requireInternalBearer } from "@/lib/auth/require-internal-token";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { runScheduledBriefBodySchema } from "@/lib/chat/scheduled-brief";
import { runDueScheduledBriefs, runScheduledBrief } from "@/lib/chat/run-scheduled-brief";

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
    // Cron / due sweep across users — host internal bearer only.
    if (parsed.data.force !== true && parsed.data.source === "schedule") {
      const internal = requireInternalBearer(request);
      if (!internal.ok) {
        return internal.response;
      }
      const results = await runDueScheduledBriefs();
      return NextResponse.json({ results });
    }

    const session = await requireSessionUserId();
    if (!session.ok) {
      return session.response;
    }

    const result = await runScheduledBrief({
      userId: session.userId,
      force: parsed.data.force === true,
    });
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
