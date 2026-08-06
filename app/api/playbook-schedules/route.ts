import { NextResponse } from "next/server";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import {
  createScheduledPlaybook,
  createScheduledPlaybookBodySchema,
  readScheduledPlaybooks,
} from "@/lib/chat/scheduled-playbooks";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    return auth.response;
  }
  const schedules = await readScheduledPlaybooks(auth.session.workspaceId);
  return NextResponse.json({ schedules });
}

export async function POST(request: Request) {
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

  const parsed = createScheduledPlaybookBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const schedule = await createScheduledPlaybook(
      auth.session.workspaceId,
      auth.session.userId,
      parsed.data,
    );
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create schedule." },
      { status: 400 },
    );
  }
}
