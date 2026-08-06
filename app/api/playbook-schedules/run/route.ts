import { NextResponse } from "next/server";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { runScheduledPlaybookBodySchema } from "@/lib/chat/scheduled-playbooks";
import { runDueScheduledPlaybooks, runScheduledPlaybook } from "@/lib/chat/run-scheduled-playbook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = runScheduledPlaybookBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    if (parsed.data.id) {
      const session = await requireSessionUserId();
      if (!session.ok) {
        return session.response;
      }
      const result = await runScheduledPlaybook({
        id: parsed.data.id,
        force: parsed.data.force === true,
        userId: session.userId,
      });
      if (result.skipped) {
        return NextResponse.json(result);
      }
      return NextResponse.json(result, { status: 201 });
    }

    // Cron due sweep across all users (no session).
    const results = await runDueScheduledPlaybooks();
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to run playbook schedule.",
      },
      { status: 502 },
    );
  }
}
