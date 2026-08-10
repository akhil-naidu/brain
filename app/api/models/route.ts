import { NextResponse } from "next/server";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { buildMergedModelCatalog } from "@/lib/chat/custom-models/catalog";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    return auth.response;
  }

  const models = await buildMergedModelCatalog({
    workspaceId: auth.session.workspaceId,
  });

  return NextResponse.json({
    models,
    workspaceId: auth.session.workspaceId,
  });
}
