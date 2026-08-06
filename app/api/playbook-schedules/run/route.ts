import { NextResponse } from "next/server";
import { requireInternalBearer } from "@/lib/auth/require-internal-token";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
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
      const auth = await requireWorkspaceSession();
      if (!auth.ok) {
        return auth.response;
      }
      const result = await runScheduledPlaybook({
        id: parsed.data.id,
        force: parsed.data.force === true,
        workspaceId: auth.session.workspaceId,
      });
      if (result.skipped) {
        return NextResponse.json(result);
      }
      return NextResponse.json(result, { status: 201 });
    }

    // Cron due sweep across all users — host internal bearer only.
    const internal = requireInternalBearer(request);
    if (!internal.ok) {
      return internal.response;
    }
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
