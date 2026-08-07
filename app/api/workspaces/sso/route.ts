import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveLicenseEntitlements } from "@/lib/auth/license";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { ensureAuthReady } from "@/lib/auth/server";
import { parseEmailDomains } from "@/lib/auth/sso/domains";
import { createSsoProviderStore } from "@/lib/auth/sso/provider-store";
import { isWorkspaceAdminRole } from "@/lib/auth/workspaces/types";
import { getPool } from "@/lib/db/pool";
import { resolvePublicOrigin } from "@/lib/http/public-origin";

export const runtime = "nodejs";

const domainListSchema = z
  .union([z.array(z.string()), z.string()])
  .transform((value) => parseEmailDomains(value));

const oidcPutSchema = z
  .object({
    protocol: z.literal("oidc"),
    providerId: z
      .string()
      .trim()
      .min(1)
      .regex(/^[a-zA-Z0-9_-]+$/),
    issuer: z.string().url(),
    domains: domainListSchema,
    clientId: z.string().trim().min(1),
    clientSecret: z.string().optional(),
    scopes: z.array(z.string()).optional(),
    pkce: z.boolean().optional(),
    discoveryEndpoint: z.string().url().optional(),
  })
  .strict();

const samlPutSchema = z
  .object({
    protocol: z.literal("saml"),
    providerId: z
      .string()
      .trim()
      .min(1)
      .regex(/^[a-zA-Z0-9_-]+$/),
    issuer: z.string().url(),
    domains: domainListSchema,
    entryPoint: z.string().url(),
    cert: z.string().optional(),
    audience: z.string().optional(),
    wantAssertionsSigned: z.boolean().optional(),
  })
  .strict();

const putSchema = z.discriminatedUnion("protocol", [oidcPutSchema, samlPutSchema]);

const deleteSchema = z
  .object({
    providerId: z.string().trim().min(1),
  })
  .strict();

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
      providers: [],
      canManage: false,
      ssoLicensed: entitlements.sso,
      workspaceId: session.session.workspaceId,
    });
  }

  const store = createSsoProviderStore(getPool());
  const origin = resolvePublicOrigin(request);
  const providers = (await store.listByWorkspace(session.session.workspaceId)).map((provider) => {
    return Object.assign({}, provider, {
      oidcCallbackUrl: new URL(provider.oidcCallbackPath, origin).toString(),
      samlCallbackUrl: new URL(provider.samlCallbackPath, origin).toString(),
    });
  });

  return NextResponse.json({
    providers,
    canManage,
    ssoLicensed: true,
    workspaceId: session.session.workspaceId,
  });
}

export async function PUT(request: Request) {
  await ensureAuthReady();
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  if (session.session.workspace.kind !== "team") {
    return NextResponse.json(
      { error: "SSO is only available for team workspaces." },
      { status: 400 },
    );
  }
  if (!isWorkspaceAdminRole(session.session.role)) {
    return NextResponse.json(
      { error: "Only workspace owners or admins can manage SSO." },
      { status: 403 },
    );
  }
  const entitlements = await resolveLicenseEntitlements();
  if (!entitlements.sso) {
    return NextResponse.json({ error: "This license does not allow SSO." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid SSO provider payload." }, { status: 400 });
  }

  const store = createSsoProviderStore(getPool());
  const origin = resolvePublicOrigin(request);
  try {
    const provider =
      parsed.data.protocol === "oidc"
        ? await store.upsertOidc({
            providerId: parsed.data.providerId,
            issuer: parsed.data.issuer,
            domains: parsed.data.domains,
            workspaceId: session.session.workspaceId,
            userId: session.session.userId,
            clientId: parsed.data.clientId,
            clientSecret: parsed.data.clientSecret,
            scopes: parsed.data.scopes,
            pkce: parsed.data.pkce,
            discoveryEndpoint: parsed.data.discoveryEndpoint,
          })
        : await store.upsertSaml({
            providerId: parsed.data.providerId,
            issuer: parsed.data.issuer,
            domains: parsed.data.domains,
            workspaceId: session.session.workspaceId,
            userId: session.session.userId,
            entryPoint: parsed.data.entryPoint,
            cert: parsed.data.cert ?? "",
            callbackUrl: new URL(
              `/api/auth/sso/saml2/callback/${parsed.data.providerId}`,
              origin,
            ).toString(),
            audience: parsed.data.audience,
            wantAssertionsSigned: parsed.data.wantAssertionsSigned,
          });
    return NextResponse.json({
      provider: Object.assign({}, provider, {
        oidcCallbackUrl: new URL(provider.oidcCallbackPath, origin).toString(),
        samlCallbackUrl: new URL(provider.samlCallbackPath, origin).toString(),
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save SSO provider.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  await ensureAuthReady();
  const session = await requireWorkspaceSession();
  if (!session.ok) {
    return session.response;
  }
  if (session.session.workspace.kind !== "team") {
    return NextResponse.json(
      { error: "SSO is only available for team workspaces." },
      { status: 400 },
    );
  }
  if (!isWorkspaceAdminRole(session.session.role)) {
    return NextResponse.json(
      { error: "Only workspace owners or admins can manage SSO." },
      { status: 403 },
    );
  }
  const entitlements = await resolveLicenseEntitlements();
  if (!entitlements.sso) {
    return NextResponse.json({ error: "This license does not allow SSO." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "providerId is required." }, { status: 400 });
  }

  try {
    await createSsoProviderStore(getPool()).deleteProvider(
      parsed.data.providerId,
      session.session.workspaceId,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete SSO provider.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
