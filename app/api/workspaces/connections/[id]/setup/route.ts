import { NextResponse } from "next/server";
import { z } from "zod";
import {
  connectionCallbackPath,
  deleteWorkspaceAppCredentials,
  providerNeedsStaticAppCredentials,
  readWorkspaceAppCredentials,
  resolveProviderAppCredentials,
  writeWorkspaceAppCredentials,
} from "@/agent/lib/connection-credentials";
import { getChatConnectionProvider } from "@/agent/lib/connection-status";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { isWorkspaceAdminRole } from "@/lib/auth/workspaces/types";
import { resolvePublicOrigin } from "@/lib/http/public-origin";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

const putBodySchema = z
  .object({
    clientId: z.string().min(1),
    clientSecret: z.string().optional(),
  })
  .strict();

export async function GET(request: Request, context: RouteContext) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  const { id } = await context.params;
  const provider = getChatConnectionProvider(id);
  if (!provider) {
    return NextResponse.json({ error: "Unknown connection." }, { status: 404 });
  }
  if (!providerNeedsStaticAppCredentials(provider)) {
    return NextResponse.json(
      { error: `${provider.displayName} does not need app credentials in Brain.` },
      { status: 400 },
    );
  }

  const workspaceId = session.session.workspaceId;
  const stored = await readWorkspaceAppCredentials(workspaceId, provider.name);
  const resolved = await resolveProviderAppCredentials(provider, process.env, workspaceId);
  const origin = resolvePublicOrigin(request);
  const callbackPath = connectionCallbackPath(provider.name);

  return NextResponse.json({
    id: provider.name,
    displayName: provider.displayName,
    requiresClientSecret: Boolean(provider.clientSecretEnv),
    hasWorkspaceCredentials: Boolean(stored?.clientId),
    hasCredentials: Boolean(resolved?.clientId),
    credentialSource: resolved?.source ?? null,
    clientIdEnv: provider.clientIdEnv,
    clientSecretEnv: provider.clientSecretEnv,
    callbackPath,
    callbackUrl: new URL(callbackPath, origin).toString(),
    canManageCredentials: isWorkspaceAdminRole(session.session.role),
    workspaceId,
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  if (!isWorkspaceAdminRole(session.session.role)) {
    return NextResponse.json(
      { error: "Only workspace owners or admins can manage workspace app credentials." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const provider = getChatConnectionProvider(id);
  if (!provider) {
    return NextResponse.json({ error: "Unknown connection." }, { status: 404 });
  }
  if (!providerNeedsStaticAppCredentials(provider)) {
    return NextResponse.json(
      { error: `${provider.displayName} does not need app credentials in Brain.` },
      { status: 400 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Client ID is required." }, { status: 400 });
  }

  if (provider.clientSecretEnv && !parsed.data.clientSecret?.trim()) {
    return NextResponse.json({ error: "Client secret is required." }, { status: 400 });
  }

  try {
    await writeWorkspaceAppCredentials(session.session.workspaceId, provider.name, {
      clientId: parsed.data.clientId,
      clientSecret: parsed.data.clientSecret,
    });
    return NextResponse.json({
      ok: true,
      displayName: provider.displayName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save credentials.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  if (!isWorkspaceAdminRole(session.session.role)) {
    return NextResponse.json(
      { error: "Only workspace owners or admins can manage workspace app credentials." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const provider = getChatConnectionProvider(id);
  if (!provider) {
    return NextResponse.json({ error: "Unknown connection." }, { status: 404 });
  }
  if (!providerNeedsStaticAppCredentials(provider)) {
    return NextResponse.json(
      { error: `${provider.displayName} does not need app credentials in Brain.` },
      { status: 400 },
    );
  }

  await deleteWorkspaceAppCredentials(session.session.workspaceId, provider.name);
  return NextResponse.json({ ok: true, displayName: provider.displayName });
}
