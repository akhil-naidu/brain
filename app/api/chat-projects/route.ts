import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { getChatStore } from "@/lib/chat/store";

export const runtime = "nodejs";

const createProjectBodySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(120),
});

export async function GET() {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  const projects = await getChatStore().listProjects(
    session.session.userId,
    session.session.workspaceId,
  );
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createProjectBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const project = await getChatStore().createProject(session.session.userId, {
    id: parsed.data.id,
    name: parsed.data.name,
    workspaceId: session.session.workspaceId,
  });

  return NextResponse.json({ project }, { status: 201 });
}
