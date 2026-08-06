import { NextResponse } from "next/server";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import {
  deleteScheduledPlaybook,
  updateScheduledPlaybook,
  updateScheduledPlaybookBodySchema,
} from "@/lib/chat/scheduled-playbooks";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    return auth.response;
  }
  const { id } = await context.params;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = updateScheduledPlaybookBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const schedule = await updateScheduledPlaybook(auth.session.workspaceId, id, parsed.data);
    return NextResponse.json({ schedule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update schedule.";
    const status = message === "Schedule not found." ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    return auth.response;
  }
  const { id } = await context.params;
  const deleted = await deleteScheduledPlaybook(auth.session.workspaceId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
