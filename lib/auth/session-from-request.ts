import { timingSafeEqual } from "node:crypto";
import { resolveInternalOperatorToken, resolveOperatorUserId } from "@/lib/auth/operator";
import { sessionAuthContext } from "@/lib/auth/principal";
import { readRunAsUserId, readWorkspaceId } from "@/lib/auth/run-as";
import { ensureAuthReady, getAuth, getWorkspaceStore } from "@/lib/auth/server";
import { getChatStore } from "@/lib/chat/store";
import { getUserDataStore } from "@/lib/chat/user-data/sqlite-user-data-store";

function secretsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

function extractBearer(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function ensureUserWorkspaceData(userId: string, workspaceId: string): void {
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

function isInternalBearer(request: Request, env: Record<string, string | undefined>): boolean {
  const internal = resolveInternalOperatorToken(env);
  const bearer = extractBearer(request.headers.get("authorization"));
  return Boolean(internal && bearer && secretsEqual(bearer, internal));
}

export async function resolveBrainUserIdFromRequest(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): Promise<string | null> {
  if (isInternalBearer(request, env)) {
    const runAs = readRunAsUserId(request.headers);
    if (runAs) {
      return runAs;
    }
    return resolveOperatorUserId(env);
  }

  await ensureAuthReady(env);
  const session = await getAuth(env).api.getSession({ headers: request.headers });
  const userId = session?.user?.id?.trim();
  return userId || null;
}

export async function resolveBrainWorkspaceIdFromRequest(
  request: Request,
  userId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<string | null> {
  const headerWorkspace = readWorkspaceId(request.headers);

  // Internal scheduled runs trust the workspace header without membership lookup.
  if (isInternalBearer(request, env)) {
    return headerWorkspace;
  }

  await ensureAuthReady(env);
  const workspaces = getWorkspaceStore(env);
  if (headerWorkspace) {
    if (!workspaces.getMembership(headerWorkspace, userId)) {
      return null;
    }
    ensureUserWorkspaceData(userId, headerWorkspace);
    return headerWorkspace;
  }
  try {
    const active = workspaces.resolveActiveWorkspace(userId);
    ensureUserWorkspaceData(userId, active.id);
    return active.id;
  } catch {
    return null;
  }
}

export async function resolveBrainSessionAuthFromRequest(
  request: Request,
  env: Record<string, string | undefined> = process.env,
) {
  const userId = await resolveBrainUserIdFromRequest(request, env);
  if (!userId) {
    return null;
  }
  const workspaceId = await resolveBrainWorkspaceIdFromRequest(request, userId, env);
  if (!workspaceId) {
    return null;
  }
  return sessionAuthContext(userId, workspaceId);
}
