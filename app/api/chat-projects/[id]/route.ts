import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { getChatStore } from "@/lib/chat/store";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ id: string }>;
};

const updateProjectBodySchema = z.object({
  name: z.string().min(1).max(120),
});

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateProjectBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const project = await getChatStore().updateProject(
      session.session.userId,
      session.session.workspaceId,
      id,
      { name: parsed.data.name },
    );
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update project.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  const { id } = await context.params;
  const deleted = await getChatStore().deleteProject(
    session.session.userId,
    session.session.workspaceId,
    id,
  );
  if (!deleted) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
