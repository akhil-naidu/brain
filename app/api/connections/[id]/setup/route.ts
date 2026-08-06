import { NextResponse } from "next/server";
import { z } from "zod";
import {
  connectionCallbackPath,
  deleteStoredAppCredentials,
  providerNeedsCredentialSetup,
  providerNeedsStaticAppCredentials,
  providerUsesPatAuth,
  readStoredAppCredentials,
  resolveProviderAppCredentials,
  resolveProviderMcpUrlSync,
  writeStoredAppCredentials,
} from "@/agent/lib/connection-credentials";
import { getChatConnectionProvider } from "@/agent/lib/connection-status";
import { reloadSnowflakeConnectionModule } from "@/agent/lib/snowflake-connection-reload";
import { resolvePublicOrigin } from "@/lib/http/public-origin";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

const putBodySchema = z
  .object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    accessToken: z.string().optional(),
    mcpUrl: z.string().optional(),
  })
  .strict();

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const provider = getChatConnectionProvider(id);
  if (!provider) {
    return NextResponse.json({ error: "Unknown connection." }, { status: 404 });
  }
  if (!providerNeedsCredentialSetup(provider)) {
    return NextResponse.json(
      { error: `${provider.displayName} does not need app credentials in Brain.` },
      { status: 400 },
    );
  }

  const stored = await readStoredAppCredentials(provider.name);
  const resolved = await resolveProviderAppCredentials(provider);
  const origin = resolvePublicOrigin(request);
  const callbackPath = connectionCallbackPath(provider.name);
  const usesPat = providerUsesPatAuth(provider);
  const requiresMcpUrl = Boolean(provider.mcpUrlEnv);
  const mcpUrl = requiresMcpUrl ? resolveProviderMcpUrlSync(provider) : null;

  return NextResponse.json({
    id: provider.name,
    displayName: provider.displayName,
    authKind: usesPat ? "pat" : "oauth",
    requiresClientId: providerNeedsStaticAppCredentials(provider),
    requiresClientSecret: Boolean(provider.clientSecretEnv) && !usesPat,
    requiresAccessToken: usesPat,
    requiresMcpUrl,
    hasStoredCredentials: Boolean(stored?.clientId || stored?.accessToken),
    hasCredentials: Boolean(resolved?.clientId || resolved?.accessToken),
    credentialSource: resolved?.source ?? null,
    clientIdEnv: provider.clientIdEnv,
    clientSecretEnv: provider.clientSecretEnv,
    patTokenEnv: provider.patTokenEnv,
    mcpUrlEnv: provider.mcpUrlEnv,
    mcpUrl: mcpUrl ?? undefined,
    callbackPath,
    callbackUrl: new URL(callbackPath, origin).toString(),
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const provider = getChatConnectionProvider(id);
  if (!provider) {
    return NextResponse.json({ error: "Unknown connection." }, { status: 404 });
  }
  if (!providerNeedsCredentialSetup(provider)) {
    return NextResponse.json(
      { error: `${provider.displayName} does not need app credentials in Brain.` },
      { status: 400 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid setup payload." }, { status: 400 });
  }

  const usesPat = providerUsesPatAuth(provider);
  const existing = await readStoredAppCredentials(provider.name);
  const nextAccessToken = parsed.data.accessToken?.trim() || existing?.accessToken;
  const nextClientId = parsed.data.clientId?.trim() || existing?.clientId;
  const nextClientSecret = parsed.data.clientSecret?.trim() || existing?.clientSecret;
  const nextMcpUrl = parsed.data.mcpUrl?.trim() || existing?.mcpUrl;

  if (usesPat) {
    if (!nextAccessToken) {
      return NextResponse.json(
        { error: "Programmatic Access Token is required." },
        { status: 400 },
      );
    }
  } else if (!nextClientId) {
    return NextResponse.json({ error: "Client ID is required." }, { status: 400 });
  }

  if (!usesPat && provider.clientSecretEnv && !nextClientSecret) {
    return NextResponse.json({ error: "Client secret is required." }, { status: 400 });
  }

  if (provider.mcpUrlEnv && !nextMcpUrl) {
    return NextResponse.json({ error: "MCP server URL is required." }, { status: 400 });
  }

  try {
    await writeStoredAppCredentials(provider.name, {
      clientId: usesPat ? undefined : nextClientId,
      clientSecret: usesPat ? undefined : nextClientSecret,
      accessToken: usesPat ? nextAccessToken : undefined,
      mcpUrl: nextMcpUrl,
    });
    if (provider.name === "snowflake") {
      await reloadSnowflakeConnectionModule();
    }
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
  const { id } = await context.params;
  const provider = getChatConnectionProvider(id);
  if (!provider) {
    return NextResponse.json({ error: "Unknown connection." }, { status: 404 });
  }
  if (!providerNeedsCredentialSetup(provider)) {
    return NextResponse.json(
      { error: `${provider.displayName} does not need app credentials in Brain.` },
      { status: 400 },
    );
  }

  await deleteStoredAppCredentials(provider.name);
  if (provider.name === "snowflake") {
    await reloadSnowflakeConnectionModule();
  }
  return NextResponse.json({ ok: true, displayName: provider.displayName });
}
