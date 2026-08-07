import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveLicenseEntitlements } from "@/lib/auth/license";
import { requireWorkspaceSession } from "@/lib/auth/require-workspace-session";
import { ensureAuthReady } from "@/lib/auth/server";
import {
  createDomainVerificationStore,
  domainVerificationDnsHost,
  domainVerificationIdentifier,
} from "@/lib/auth/sso/domain-verification";
import { createSsoProviderStore } from "@/lib/auth/sso/provider-store";
import { isWorkspaceAdminRole } from "@/lib/auth/workspaces/types";
import { getPool } from "@/lib/db/pool";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    providerId: z.string().trim().min(1),
    action: z.enum(["request", "verify"]),
  })
  .strict();

export async function POST(request: Request) {
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
      { error: "Only workspace owners or admins can verify SSO domains." },
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
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const pool = getPool();
  const providers = await createSsoProviderStore(pool).listByWorkspace(session.session.workspaceId);
  const provider = providers.find((item) => item.providerId === parsed.data.providerId);
  if (!provider) {
    return NextResponse.json(
      { error: "SSO provider not found in this workspace." },
      { status: 404 },
    );
  }

  const verification = createDomainVerificationStore(pool);
  const identifier = domainVerificationIdentifier(provider.providerId);

  try {
    if (parsed.data.action === "request") {
      const token = await verification.issueToken(provider.providerId);
      return NextResponse.json({
        providerId: provider.providerId,
        domainVerified: false,
        domainVerificationToken: token,
        dnsIdentifier: identifier,
        domains: provider.domains.map((domain) => ({
          domain,
          host: domainVerificationDnsHost(provider.providerId, domain),
          value: token,
          valueAlt: `${identifier}=${token}`,
        })),
      });
    }

    await verification.verifyProviderDomains(provider.providerId);
    return NextResponse.json({
      providerId: provider.providerId,
      domainVerified: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Domain verification failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
