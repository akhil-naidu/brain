import { NextResponse } from "next/server";
import { z } from "zod";
import { isOperatorUserId } from "@/lib/auth/require-operator-session";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { builtinModelsWithAvailability } from "@/lib/chat/builtin-models/availability";
import { BuiltinModelValidationError, getBuiltinModelStore } from "@/lib/chat/builtin-models/store";

export const runtime = "nodejs";

const patchSchema = z.union([
  z
    .object({
      modelId: z.string().min(1),
      enabled: z.boolean(),
    })
    .strict(),
  z
    .object({
      all: z.literal(true),
      enabled: z.boolean(),
    })
    .strict(),
]);

function canManageBuiltin(role: string, isInstanceAdmin: boolean): boolean {
  return isInstanceAdmin || role === "owner" || role === "admin";
}

export async function PATCH(request: Request) {
  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    return auth.response;
  }

  const isInstanceAdmin = await isOperatorUserId(auth.session.userId);
  if (!canManageBuiltin(auth.session.role, isInstanceAdmin)) {
    return NextResponse.json(
      { error: "Only workspace owners, admins, or the instance admin can change built-in models." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid built-in model body" }, { status: 400 });
  }

  try {
    const store = getBuiltinModelStore();
    if ("all" in parsed.data) {
      await store.setAllEnabled(auth.session.workspaceId, parsed.data.enabled);
    } else {
      await store.setEnabled(auth.session.workspaceId, parsed.data.modelId, parsed.data.enabled);
    }
    const disabledIds = await store.listDisabledModelIds(auth.session.workspaceId);
    return NextResponse.json({
      builtinModels: builtinModelsWithAvailability(disabledIds),
    });
  } catch (error) {
    if (error instanceof BuiltinModelValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unable to update built-in model.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
