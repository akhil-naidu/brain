import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveLicenseEntitlements } from "@/lib/auth/license";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { scimBasePath, scimProviderIdForWorkspace } from "@/lib/auth/scim/provider-id";
import { ensureAuthReady, getAuth } from "@/lib/auth/server";
import { isWorkspaceAdminRole } from "@/lib/auth/workspaces/types";
import { resolvePublicOrigin } from "@/lib/http/public-origin";

export const runtime = "nodejs";

const postSchema = z
  .object({
    action: z.enum(["generate", "revoke"]),
  })
  .strict();

async function connectionExists(request: Request, providerId: string): Promise<boolean> {
  try {
    const connection = await getAuth().api.getSCIMProviderConnection({
      query: { providerId },
      headers: request.headers,
    });
    return Boolean(connection);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  await ensureAuthReady();
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  const entitlements = await resolveLicenseEntitlements();
  const canManage =
    session.session.workspace.kind === "team" &&
    isWorkspaceAdminRole(session.session.role) &&
    entitlements.sso;

  if (session.session.workspace.kind !== "team" || !entitlements.sso) {
    return NextResponse.json({
      enabled: false,
      canManage: false,
      ssoLicensed: entitlements.sso,
      providerId: null,
      baseUrl: null,
      connected: false,
    });
  }

  const providerId = scimProviderIdForWorkspace(session.session.workspaceId);
  const origin = resolvePublicOrigin(request);
  const connected = canManage ? await connectionExists(request, providerId) : false;

  return NextResponse.json({
    enabled: true,
    canManage,
    ssoLicensed: true,
    providerId,
    baseUrl: new URL(scimBasePath(), origin).toString(),
    connected,
  });
}

export async function POST(request: Request) {
  await ensureAuthReady();
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  if (session.session.workspace.kind !== "team") {
    return NextResponse.json(
      { error: "SCIM is only available for team workspaces." },
      { status: 400 },
    );
  }
  if (!isWorkspaceAdminRole(session.session.role)) {
    return NextResponse.json(
      { error: "Only workspace owners or admins can manage SCIM." },
      { status: 403 },
    );
  }
  const entitlements = await resolveLicenseEntitlements();
  if (!entitlements.sso) {
    return NextResponse.json({ error: "This license does not allow SSO/SCIM." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const providerId = scimProviderIdForWorkspace(session.session.workspaceId);
  const origin = resolvePublicOrigin(request);
  const baseUrl = new URL(scimBasePath(), origin).toString();

  try {
    if (parsed.data.action === "revoke") {
      await getAuth().api.deleteSCIMProviderConnection({
        body: { providerId },
        headers: request.headers,
      });
      return NextResponse.json({
        providerId,
        baseUrl,
        connected: false,
        scimToken: null,
      });
    }

    // Revoke any existing connection so generate always returns a fresh token.
    if (await connectionExists(request, providerId)) {
      await getAuth().api.deleteSCIMProviderConnection({
        body: { providerId },
        headers: request.headers,
      });
    }

    const result = await getAuth().api.generateSCIMToken({
      body: { providerId },
      headers: request.headers,
    });

    return NextResponse.json({
      providerId,
      baseUrl,
      connected: true,
      scimToken: result.scimToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SCIM operation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
