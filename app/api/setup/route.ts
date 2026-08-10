import { NextResponse } from "next/server";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { getCustomModelStore } from "@/lib/chat/custom-models/store";
import { isCommandCodeApiKeyConfigured } from "@/lib/chat/provider-setup";

export const runtime = "nodejs";

export async function GET() {
  const commandCodeApiKeyConfigured = isCommandCodeApiKeyConfigured();

  const auth = await requireWorkspaceSession();
  if (!auth.ok) {
    // Unauthenticated / no workspace: still report Command Code without leaking customs.
    return NextResponse.json({
      commandCodeApiKeyConfigured,
      customModelsAvailable: false,
    });
  }

  let customModelsAvailable = false;
  try {
    customModelsAvailable =
      (await getCustomModelStore().countVisible(auth.session.workspaceId)) > 0;
  } catch {
    customModelsAvailable = false;
  }

  return NextResponse.json({
    commandCodeApiKeyConfigured,
    customModelsAvailable,
  });
}
