import { NextResponse } from "next/server";
import { z } from "zod";
import {
  connectionCallbackPath,
  deleteStoredAppCredentials,
  providerNeedsStaticAppCredentials,
  readStoredAppCredentials,
  resolveProviderAppCredentials,
  writeStoredAppCredentials,
} from "@/agent/lib/connection-credentials";
import {
  getChatConnectionProvider,
  isHttpMcpUrlConnectionId,
  isSnowflakeConnectionId,
} from "@/agent/lib/connection-status";
import {
  buildHostHttpMcpSetupResponse,
  clearHostHttpMcpSetup,
  saveHostHttpMcpSetup,
} from "@/agent/lib/http-mcp-setup";
import {
  buildHostSnowflakeSetupResponse,
  clearHostSnowflakeSetup,
  saveHostSnowflakeSetup,
} from "@/agent/lib/snowflake-setup";
import { SNOWFLAKE_DISPLAY_NAME } from "@/agent/lib/snowflake-mcp-url";
import { isOperatorUserId, requireOperatorSession } from "@/lib/auth/require-operator-session";
import { requireSessionUserId } from "@/lib/auth/require-session";
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
  const session = await requireSessionUserId();
  if (!session.ok) {
    return session.response;
  }
  const { id } = await context.params;
  const origin = resolvePublicOrigin(request);
  const canManageCredentials = await isOperatorUserId(session.userId);

  if (isSnowflakeConnectionId(id)) {
    return NextResponse.json(
      await buildHostSnowflakeSetupResponse({ canManageCredentials, origin }),
    );
  }

  if (isHttpMcpUrlConnectionId(id)) {
    return NextResponse.json(
      await buildHostHttpMcpSetupResponse({
        connectionId: id,
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

  const stored = await readStoredAppCredentials(provider.name);
  const resolved = await resolveProviderAppCredentials(provider);
  const callbackPath = connectionCallbackPath(provider.name);

  return NextResponse.json({
    id: provider.name,
    displayName: provider.displayName,
    setupKind: "oauth",
    requiresClientSecret: Boolean(provider.clientSecretEnv),
    hasStoredCredentials: Boolean(stored?.clientId),
    hasCredentials: Boolean(resolved?.clientId),
    credentialSource: resolved?.source ?? null,
    storedClientId: canManageCredentials ? (stored?.clientId ?? null) : null,
    clientIdEnv: provider.clientIdEnv,
    clientSecretEnv: provider.clientSecretEnv,
    callbackPath,
    callbackUrl: new URL(callbackPath, origin).toString(),
    canManageCredentials,
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await requireOperatorSession();
  if (!session.ok) {
    return session.response;
  }
  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Client ID is required." }, { status: 400 });
  }

  if (isSnowflakeConnectionId(id)) {
    try {
      await saveHostSnowflakeSetup({
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
      const displayName = await saveHostHttpMcpSetup(id, {
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

  const existing = await readStoredAppCredentials(provider.name);
  const nextSecret = parsed.data.clientSecret?.trim() || existing?.clientSecret;
  if (provider.clientSecretEnv && !nextSecret) {
    return NextResponse.json({ error: "Client secret is required." }, { status: 400 });
  }

  try {
    await writeStoredAppCredentials(provider.name, {
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
  const session = await requireOperatorSession();
  if (!session.ok) {
    return session.response;
  }
  const { id } = await context.params;

  if (isSnowflakeConnectionId(id)) {
    await clearHostSnowflakeSetup();
    return NextResponse.json({ ok: true, displayName: SNOWFLAKE_DISPLAY_NAME });
  }

  if (isHttpMcpUrlConnectionId(id)) {
    const displayName = await clearHostHttpMcpSetup(id);
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

  await deleteStoredAppCredentials(provider.name);
  return NextResponse.json({ ok: true, displayName: provider.displayName });
}
