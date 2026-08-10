import { NextResponse } from "next/server";
import { z } from "zod";
import { isOperatorUserId } from "@/lib/auth/require-operator-session";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { CustomModelValidationError, getCustomModelStore } from "@/lib/chat/custom-models/store";

export const runtime = "nodejs";

const createSchema = z
  .object({
    scope: z.enum(["instance", "workspace"]),
    label: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    baseUrl: z.string().min(1).max(2048),
    providerModelId: z.string().min(1).max(256),
    contextWindowTokens: z.number().int().positive(),
    apiKey: z.string().max(4096).optional().nullable(),
  })
  .strict();

function canManageWorkspace(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function GET() {
  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    return auth.response;
  }

  const store = getCustomModelStore();
  const isInstanceAdmin = await isOperatorUserId(auth.session.userId);
  const canManageWs = canManageWorkspace(auth.session.role);

  const [instanceModels, workspaceModels] = await Promise.all([
    store.listInstanceModels(),
    store.listWorkspaceModels(auth.session.workspaceId),
  ]);

  return NextResponse.json({
    instanceModels,
    workspaceModels,
    capabilities: {
      canManageInstance: isInstanceAdmin,
      canManageWorkspace: canManageWs,
    },
    workspaceId: auth.session.workspaceId,
  });
}

export async function POST(request: Request) {
  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid custom model body" }, { status: 400 });
  }

  if (parsed.data.scope === "instance") {
    if (!(await isOperatorUserId(auth.session.userId))) {
      return NextResponse.json(
        { error: "Only the instance admin can create instance models." },
        { status: 403 },
      );
    }
  } else if (!canManageWorkspace(auth.session.role)) {
    return NextResponse.json(
      { error: "Only workspace owners or admins can create workspace models." },
      { status: 403 },
    );
  }

  try {
    const model = await getCustomModelStore().create({
      scope: parsed.data.scope,
      workspaceId: parsed.data.scope === "workspace" ? auth.session.workspaceId : null,
      label: parsed.data.label,
      description: parsed.data.description,
      baseUrl: parsed.data.baseUrl,
      providerModelId: parsed.data.providerModelId,
      contextWindowTokens: parsed.data.contextWindowTokens,
      apiKey: parsed.data.apiKey,
    });
    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    if (error instanceof CustomModelValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unable to create custom model.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
