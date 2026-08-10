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
import {
  getChatConnectionProvider,
  isHttpMcpUrlConnectionId,
  isSnowflakeConnectionId,
} from "@/agent/lib/connection-status";
import {
  buildWorkspaceHttpMcpSetupResponse,
  clearWorkspaceHttpMcpSetup,
  saveWorkspaceHttpMcpSetup,
} from "@/agent/lib/http-mcp-setup";
import {
  buildWorkspaceSnowflakeSetupResponse,
  clearWorkspaceSnowflakeSetup,
  saveWorkspaceSnowflakeSetup,
} from "@/agent/lib/snowflake-setup";
import { SNOWFLAKE_DISPLAY_NAME } from "@/agent/lib/snowflake-mcp-url";
import { assertByoaAllowed, resolveLicenseEntitlements } from "@/lib/auth/license";
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
  const workspaceId = session.session.workspaceId;
  const origin = resolvePublicOrigin(request);
  const canManageCredentials = isWorkspaceAdminRole(session.session.role);

  if (isSnowflakeConnectionId(id)) {
    return NextResponse.json(
      await buildWorkspaceSnowflakeSetupResponse({
        workspaceId,
        canManageCredentials,
        origin,
      }),
    );
  }

  if (isHttpMcpUrlConnectionId(id)) {
    return NextResponse.json(
      await buildWorkspaceHttpMcpSetupResponse({
        connectionId: id,
        workspaceId,
        canManageCredentials,
        origin,
      }),
    );
  }

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

  const stored = await readWorkspaceAppCredentials(workspaceId, provider.name);
  const resolved = await resolveProviderAppCredentials(provider, process.env, workspaceId);
  const callbackPath = connectionCallbackPath(provider.name);

  return NextResponse.json({
    id: provider.name,
    displayName: provider.displayName,
    setupKind: "oauth",
    requiresClientSecret: Boolean(provider.clientSecretEnv),
    hasWorkspaceCredentials: Boolean(stored?.clientId),
    hasCredentials: Boolean(resolved?.clientId),
    credentialSource: resolved?.source ?? null,
    storedClientId: canManageCredentials ? (stored?.clientId ?? null) : null,
    clientIdEnv: provider.clientIdEnv,
    clientSecretEnv: provider.clientSecretEnv,
    callbackPath,
    callbackUrl: new URL(callbackPath, origin).toString(),
    canManageCredentials,
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
  try {
    assertByoaAllowed(await resolveLicenseEntitlements());
  } catch (error) {
    const message = error instanceof Error ? error.message : "License does not allow BYOA.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Client ID is required." }, { status: 400 });
  }

  if (isSnowflakeConnectionId(id)) {
    try {
      await saveWorkspaceSnowflakeSetup(session.session.workspaceId, {
        mcpServerUrl: parsed.data.clientId,
        patToken: parsed.data.clientSecret,
      });
      return NextResponse.json({ ok: true, displayName: SNOWFLAKE_DISPLAY_NAME });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save credentials.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (isHttpMcpUrlConnectionId(id)) {
    try {
      const displayName = await saveWorkspaceHttpMcpSetup(session.session.workspaceId, id, {
        mcpServerUrl: parsed.data.clientId,
        bearerToken: parsed.data.clientSecret,
      });
      return NextResponse.json({ ok: true, displayName });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save credentials.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

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

  const existing = await readWorkspaceAppCredentials(session.session.workspaceId, provider.name);
  const nextSecret = parsed.data.clientSecret?.trim() || existing?.clientSecret;
  if (provider.clientSecretEnv && !nextSecret) {
    return NextResponse.json({ error: "Client secret is required." }, { status: 400 });
  }

  try {
    await writeWorkspaceAppCredentials(session.session.workspaceId, provider.name, {
      clientId: parsed.data.clientId,
      clientSecret: nextSecret,
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

  if (isSnowflakeConnectionId(id)) {
    await clearWorkspaceSnowflakeSetup(session.session.workspaceId);
    return NextResponse.json({ ok: true, displayName: SNOWFLAKE_DISPLAY_NAME });
  }

  if (isHttpMcpUrlConnectionId(id)) {
    const displayName = await clearWorkspaceHttpMcpSetup(session.session.workspaceId, id);
    return NextResponse.json({ ok: true, displayName });
  }

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
