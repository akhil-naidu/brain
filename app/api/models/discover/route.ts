import { NextResponse } from "next/server";
import { z } from "zod";
import { isOperatorUserId } from "@/lib/auth/require-operator-session";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { discoverRemoteModels } from "@/lib/chat/custom-models/discover";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    baseUrl: z.string().min(1).max(2048),
    apiKey: z.string().max(4096).optional().nullable(),
  })
  .strict();

function canManageWorkspace(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function POST(request: Request) {
  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    return auth.response;
  }

  const canManage =
    canManageWorkspace(auth.session.role) || (await isOperatorUserId(auth.session.userId));
  if (!canManage) {
    return NextResponse.json(
      { error: "Only workspace admins or the instance admin can discover models." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid discovery body" }, { status: 400 });
  }

  try {
    const models = await discoverRemoteModels({
      baseUrl: parsed.data.baseUrl,
      apiKey: parsed.data.apiKey,
    });
    if (models.length === 0) {
      return NextResponse.json(
        {
          error: "No models found at that URL. Check the base URL and that the server is running.",
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to discover models.",
      },
      { status: 400 },
    );
  }
}
