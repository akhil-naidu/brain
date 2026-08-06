import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

export const runtime = "nodejs";

const createBodySchema = z
  .object({
    name: z.string().trim().min(1).max(80),
  })
  .strict();

export async function GET() {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  await ensureAuthReady();
  const workspaces = getWorkspaceStore();
  const policies = workspaces.getPolicies();
  const active = workspaces.resolveActiveWorkspace(session.userId);
  const list = workspaces.listWorkspacesForUser(session.userId);
  const activeMembership = list.find((item) => item.id === active.id);
  const isInstanceAdmin = workspaces.isInstanceAdmin(session.userId);
  return NextResponse.json({
    workspaces: list,
    activeWorkspaceId: active.id,
    activeRole: activeMembership?.role ?? null,
    canCreateWorkspace: policies.allowCreateWorkspace || isInstanceAdmin,
    isInstanceAdmin,
  });
}

export async function POST(request: Request) {
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  await ensureAuthReady();
  const workspaces = getWorkspaceStore();
  const policies = workspaces.getPolicies();
  if (!policies.allowCreateWorkspace && !workspaces.isInstanceAdmin(session.userId)) {
    return NextResponse.json(
      { error: "Creating workspaces is disabled on this instance." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const workspace = workspaces.createWorkspace({
    name: parsed.data.name,
    kind: "team",
    ownerUserId: session.userId,
  });
  workspaces.setActiveWorkspaceId(session.userId, workspace.id);
  return NextResponse.json({ workspace }, { status: 201 });
}
