import { NextResponse } from "next/server";
import { requireSessionUserId } from "@/lib/auth/require-session";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";
import type { Workspace, WorkspaceRole } from "@/lib/auth/workspaces/types";
import { getChatStore } from "@/lib/chat/store";
import { getUserDataStore } from "@/lib/chat/user-data/sqlite-user-data-store";

export type WorkspaceSession = {
  readonly userId: string;
  readonly workspaceId: string;
  readonly workspace: Workspace;
  readonly role: WorkspaceRole;
};

function migrateLegacyUserData(userId: string, workspaceId: string): void {
  try {
    getChatStore().assignWorkspaceToUserChats(userId, workspaceId);
  } catch {
    // ignore
  }
  try {
    getUserDataStore().migrateUserScopedDataToWorkspace(userId, workspaceId);
  } catch {
    // ignore
  }
}

export async function requireWorkspaceSession(): Promise<
  | { readonly ok: true; readonly session: WorkspaceSession }
  | { readonly ok: false; readonly response: NextResponse }
> {
  const auth = await requireSessionUserId();
  if (!auth.ok) {
    return auth;
  }

  await ensureAuthReady();
  const workspaces = getWorkspaceStore();
  try {
    const workspace = workspaces.resolveActiveWorkspace(auth.userId);
    const role = workspaces.getMembership(workspace.id, auth.userId);
    if (!role) {
      return {
        ok: false,
        response: NextResponse.json({ error: "No workspace membership." }, { status: 403 }),
      };
    }
    migrateLegacyUserData(auth.userId, workspace.id);
    return {
      ok: true,
      session: {
        userId: auth.userId,
        workspaceId: workspace.id,
        workspace,
        role,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve workspace.";
    return {
      ok: false,
      response: NextResponse.json({ error: message }, { status: 403 }),
    };
  }
}
