import { NextResponse } from "next/server";
import { z } from "zod";
import { isOperatorUserId } from "@/lib/auth/require-operator-session";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { CustomModelValidationError, getCustomModelStore } from "@/lib/chat/custom-models/store";

export const runtime = "nodejs";

const updateSchema = z
  .object({
    label: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional(),
    baseUrl: z.string().min(1).max(2048).optional(),
    providerModelId: z.string().min(1).max(256).optional(),
    contextWindowTokens: z.number().int().positive().optional(),
    apiKey: z.string().max(4096).optional().nullable(),
  })
  .strict();

function canManageWorkspace(role: string): boolean {
  return role === "owner" || role === "admin";
}

async function authorizeMutation(
  userId: string,
  role: string,
  scope: "instance" | "workspace",
  workspaceId: string,
  modelWorkspaceId: string | null,
): Promise<NextResponse | null> {
  if (scope === "instance") {
    if (!(await isOperatorUserId(userId))) {
      return NextResponse.json(
        { error: "Only the instance admin can change instance models." },
        { status: 403 },
      );
    }
    return null;
  }

  if (!canManageWorkspace(role)) {
    return NextResponse.json(
      { error: "Only workspace owners or admins can change workspace models." },
      { status: 403 },
    );
  }

  if (modelWorkspaceId !== workspaceId) {
    return NextResponse.json({ error: "Custom model not found." }, { status: 404 });
  }

  return null;
}

type RouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const store = getCustomModelStore();
  const existing = await store.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Custom model not found." }, { status: 404 });
  }

  const denied = await authorizeMutation(
    auth.session.userId,
    auth.session.role,
    existing.scope,
    auth.session.workspaceId,
    existing.workspaceId,
  );
  if (denied) {
    return denied;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid custom model body" }, { status: 400 });
  }

  try {
    const model = await store.update(id, parsed.data);
    if (!model) {
      return NextResponse.json({ error: "Custom model not found." }, { status: 404 });
    }
    return NextResponse.json({ model });
  } catch (error) {
    if (error instanceof CustomModelValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unable to update custom model.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const store = getCustomModelStore();
  const existing = await store.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Custom model not found." }, { status: 404 });
  }

  const denied = await authorizeMutation(
    auth.session.userId,
    auth.session.role,
    existing.scope,
    auth.session.workspaceId,
    existing.workspaceId,
  );
  if (denied) {
    return denied;
  }

  await store.delete(id);
  return NextResponse.json({ ok: true });
}
