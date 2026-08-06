import { NextResponse } from "next/server";
import { z } from "zod";
import {
  connectionCallbackPath,
  deleteStoredAppCredentials,
  providerNeedsStaticAppCredentials,
  readStoredAppCredentials,
  resolveProviderAppCredentials,
  resolveProviderMcpUrlSync,
  writeStoredAppCredentials,
} from "@/agent/lib/connection-credentials";
import { getChatConnectionProvider } from "@/agent/lib/connection-status";
import { resolvePublicOrigin } from "@/lib/http/public-origin";

export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

const putBodySchema = z
  .object({
    clientId: z.string().min(1),
    clientSecret: z.string().optional(),
    mcpUrl: z.string().optional(),
  })
  .strict();

export async function GET(request: Request, context: RouteContext) {
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

  const stored = await readStoredAppCredentials(provider.name);
  const resolved = await resolveProviderAppCredentials(provider);
  const origin = resolvePublicOrigin(request);
  const callbackPath = connectionCallbackPath(provider.name);
  const requiresMcpUrl = Boolean(provider.mcpUrlEnv);
  const mcpUrl = requiresMcpUrl ? resolveProviderMcpUrlSync(provider) : null;

  return NextResponse.json({
    id: provider.name,
    displayName: provider.displayName,
    requiresClientSecret: Boolean(provider.clientSecretEnv),
    requiresMcpUrl,
    hasStoredCredentials: Boolean(stored?.clientId),
    hasCredentials: Boolean(resolved?.clientId),
    credentialSource: resolved?.source ?? null,
    clientIdEnv: provider.clientIdEnv,
    clientSecretEnv: provider.clientSecretEnv,
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

  if (provider.mcpUrlEnv && !parsed.data.mcpUrl?.trim()) {
    return NextResponse.json({ error: "MCP server URL is required." }, { status: 400 });
  }

  try {
    await writeStoredAppCredentials(provider.name, {
      clientId: parsed.data.clientId,
      clientSecret: parsed.data.clientSecret,
      mcpUrl: parsed.data.mcpUrl,
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

  await deleteStoredAppCredentials(provider.name);
  return NextResponse.json({ ok: true, displayName: provider.displayName });
}
