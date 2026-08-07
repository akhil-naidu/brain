import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import {
  assertValidEmailDomains,
  domainsFromStored,
  parseEmailDomains,
} from "@/lib/auth/sso/domains";
import { createDomainVerificationStore } from "@/lib/auth/sso/domain-verification";
import { oidcSsoCallbackPath, samlSsoCallbackPath } from "@/lib/auth/sso/paths";

type PgRow = Record<string, unknown>;

export type PublicSsoProvider = {
  readonly id: string;
  readonly providerId: string;
  readonly issuer: string;
  readonly domains: readonly string[];
  readonly protocol: "oidc" | "saml";
  readonly organizationId: string | null;
  readonly oidcCallbackPath: string;
  readonly samlCallbackPath: string;
  readonly hasClientSecret: boolean;
  readonly clientId: string | null;
  readonly domainVerified: boolean;
};

type OidcUpsertInput = {
  readonly providerId: string;
  readonly issuer: string;
  readonly domains: readonly string[];
  readonly workspaceId: string;
  readonly userId: string;
  readonly clientId: string;
  readonly clientSecret?: string;
  readonly scopes?: readonly string[];
  readonly pkce?: boolean;
  readonly discoveryEndpoint?: string;
};

type SamlUpsertInput = {
  readonly providerId: string;
  readonly issuer: string;
  readonly domains: readonly string[];
  readonly workspaceId: string;
  readonly userId: string;
  readonly entryPoint: string;
  readonly cert: string;
  readonly callbackUrl?: string;
  readonly audience?: string;
  readonly wantAssertionsSigned?: boolean;
};

function requireString(row: PgRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected string column ${key}`);
  }
  return value;
}

function optionalString(row: PgRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new Error(`Expected string or null column ${key}`);
  }
  return value;
}

function parseJsonObject(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const record: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(parsed)) {
      record[key] = entry;
    }
    return record;
  } catch {
    return null;
  }
}

function isOidcDiscovery(value: unknown): value is {
  authorization_endpoint?: string;
  issuer?: string;
  jwks_uri?: string;
  token_endpoint?: string;
  userinfo_endpoint?: string;
} {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function buildOidcConfigJson(input: {
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly scopes: readonly string[];
  readonly pkce: boolean;
  readonly discoveryEndpoint?: string;
}): Promise<string> {
  const discoveryEndpoint =
    input.discoveryEndpoint?.trim() ||
    `${input.issuer.replace(/\/+$/, "")}/.well-known/openid-configuration`;
  const response = await fetch(discoveryEndpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch OIDC discovery document (${response.status}).`);
  }
  const discoveryJson: unknown = await response.json();
  if (!isOidcDiscovery(discoveryJson)) {
    throw new Error("Invalid OIDC discovery document.");
  }
  const discovery = discoveryJson;
  return JSON.stringify({
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    discoveryEndpoint,
    authorizationEndpoint: discovery.authorization_endpoint,
    tokenEndpoint: discovery.token_endpoint,
    userInfoEndpoint: discovery.userinfo_endpoint,
    jwksEndpoint: discovery.jwks_uri,
    issuer: discovery.issuer ?? input.issuer,
    scopes: [...input.scopes],
    pkce: input.pkce,
    mapping: {
      id: "sub",
      email: "email",
      emailVerified: "email_verified",
      name: "name",
      image: "picture",
    },
  });
}

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function toPublic(row: PgRow): PublicSsoProvider {
  const providerId = requireString(row, "providerId");
  const oidcConfig = parseJsonObject(optionalString(row, "oidcConfig"));
  const protocol = oidcConfig ? "oidc" : "saml";
  const clientId =
    oidcConfig && typeof oidcConfig["clientId"] === "string" ? oidcConfig["clientId"] : null;
  const hasClientSecret = Boolean(
    oidcConfig && typeof oidcConfig["clientSecret"] === "string" && oidcConfig["clientSecret"],
  );
  return {
    id: requireString(row, "id"),
    providerId,
    issuer: requireString(row, "issuer"),
    domains: domainsFromStored(requireString(row, "domain")),
    protocol,
    organizationId: optionalString(row, "organizationId"),
    oidcCallbackPath: oidcSsoCallbackPath(providerId),
    samlCallbackPath: samlSsoCallbackPath(providerId),
    hasClientSecret,
    clientId,
    domainVerified: asBool(row["domainVerified"]),
  };
}

function assertProviderId(providerId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(providerId)) {
    throw new Error("Provider ID may only contain letters, numbers, hyphens, and underscores.");
  }
}

export function createSsoProviderStore(pool: Pool) {
  const domainVerification = createDomainVerificationStore(pool);

  async function listByWorkspace(workspaceId: string): Promise<PublicSsoProvider[]> {
    const result = await pool.query<PgRow>(
      `SELECT id, "providerId", issuer, domain, "oidcConfig", "samlConfig", "organizationId", "domainVerified"
       FROM "ssoProvider"
       WHERE "organizationId" = $1
       ORDER BY "providerId" ASC`,
      [workspaceId],
    );
    return result.rows.map(toPublic);
  }

  async function getByProviderId(providerId: string): Promise<PgRow | null> {
    const result = await pool.query<PgRow>(
      `SELECT id, "providerId", issuer, domain, "oidcConfig", "samlConfig", "organizationId", "userId", "domainVerified"
       FROM "ssoProvider" WHERE "providerId" = $1`,
      [providerId],
    );
    return result.rows[0] ?? null;
  }

  async function assertDomainsAvailable(
    domains: readonly string[],
    providerId: string,
  ): Promise<void> {
    const result = await pool.query<PgRow>(`SELECT "providerId", domain FROM "ssoProvider"`);
    for (const rawRow of result.rows) {
      const existingProviderId = requireString(rawRow, "providerId");
      if (existingProviderId === providerId) continue;
      const taken = new Set(domainsFromStored(requireString(rawRow, "domain")));
      for (const domain of domains) {
        if (taken.has(domain)) {
          throw new Error(`Email domain ${domain} is already used by another SSO provider.`);
        }
      }
    }
  }

  async function upsertOidc(input: OidcUpsertInput): Promise<PublicSsoProvider> {
    assertProviderId(input.providerId);
    const domains = parseEmailDomains([...input.domains]);
    assertValidEmailDomains(domains);
    await assertDomainsAvailable(domains, input.providerId);

    const existing = await getByProviderId(input.providerId);
    if (existing) {
      const existingWorkspace = optionalString(existing, "organizationId");
      if (existingWorkspace !== input.workspaceId) {
        throw new Error("SSO provider with this providerId already exists.");
      }
    }

    const existingOidc = existing ? parseJsonObject(optionalString(existing, "oidcConfig")) : null;
    const clientSecret =
      input.clientSecret?.trim() ||
      (existingOidc && typeof existingOidc["clientSecret"] === "string"
        ? existingOidc["clientSecret"]
        : "");
    if (!clientSecret) {
      throw new Error("Client secret is required for a new OIDC provider.");
    }

    const oidcConfig = await buildOidcConfigJson({
      issuer: input.issuer,
      clientId: input.clientId,
      clientSecret,
      scopes: input.scopes?.length ? input.scopes : ["openid", "profile", "email"],
      pkce: input.pkce ?? true,
      discoveryEndpoint: input.discoveryEndpoint,
    });
    const domain = domains.join(",");

    if (existing) {
      await pool.query(
        `UPDATE "ssoProvider"
         SET issuer = $1, domain = $2, "oidcConfig" = $3, "samlConfig" = NULL, "organizationId" = $4, "domainVerified" = false
         WHERE "providerId" = $5`,
        [input.issuer, domain, oidcConfig, input.workspaceId, input.providerId],
      );
    } else {
      await pool.query(
        `INSERT INTO "ssoProvider"
         (id, issuer, domain, "oidcConfig", "samlConfig", "userId", "providerId", "organizationId", "domainVerified")
         VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, false)`,
        [
          randomUUID(),
          input.issuer,
          domain,
          oidcConfig,
          input.userId,
          input.providerId,
          input.workspaceId,
        ],
      );
    }
    await domainVerification.markUnverified(input.providerId);
    const row = await getByProviderId(input.providerId);
    if (!row) throw new Error("Failed to persist OIDC SSO provider.");
    return toPublic(row);
  }

  async function upsertSaml(input: SamlUpsertInput): Promise<PublicSsoProvider> {
    assertProviderId(input.providerId);
    const domains = parseEmailDomains([...input.domains]);
    assertValidEmailDomains(domains);
    await assertDomainsAvailable(domains, input.providerId);

    const existing = await getByProviderId(input.providerId);
    if (existing) {
      const existingWorkspace = optionalString(existing, "organizationId");
      if (existingWorkspace !== input.workspaceId) {
        throw new Error("SSO provider with this providerId already exists.");
      }
    }

    const existingSaml = existing ? parseJsonObject(optionalString(existing, "samlConfig")) : null;
    const cert =
      input.cert.trim() ||
      (existingSaml && typeof existingSaml["cert"] === "string" ? existingSaml["cert"] : "");
    if (!cert) {
      throw new Error("IdP certificate is required for a new SAML provider.");
    }

    const samlConfig = JSON.stringify({
      entryPoint: input.entryPoint,
      cert,
      callbackUrl: input.callbackUrl,
      audience: input.audience,
      wantAssertionsSigned: input.wantAssertionsSigned ?? true,
      mapping: {
        id: "nameID",
        email: "email",
        name: "displayName",
      },
    });
    const domain = domains.join(",");

    if (existing) {
      await pool.query(
        `UPDATE "ssoProvider"
         SET issuer = $1, domain = $2, "oidcConfig" = NULL, "samlConfig" = $3, "organizationId" = $4, "domainVerified" = false
         WHERE "providerId" = $5`,
        [input.issuer, domain, samlConfig, input.workspaceId, input.providerId],
      );
    } else {
      await pool.query(
        `INSERT INTO "ssoProvider"
         (id, issuer, domain, "oidcConfig", "samlConfig", "userId", "providerId", "organizationId", "domainVerified")
         VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, false)`,
        [
          randomUUID(),
          input.issuer,
          domain,
          samlConfig,
          input.userId,
          input.providerId,
          input.workspaceId,
        ],
      );
    }
    await domainVerification.markUnverified(input.providerId);
    const row = await getByProviderId(input.providerId);
    if (!row) throw new Error("Failed to persist SAML SSO provider.");
    return toPublic(row);
  }

  async function deleteProvider(providerId: string, workspaceId: string): Promise<void> {
    const existing = await getByProviderId(providerId);
    if (!existing) throw new Error("SSO provider not found.");
    if (optionalString(existing, "organizationId") !== workspaceId) {
      throw new Error("SSO provider not found in this workspace.");
    }
    await pool.query(`DELETE FROM "ssoProvider" WHERE "providerId" = $1`, [providerId]);
  }

  async function countProviders(): Promise<number> {
    try {
      const result = await pool.query<PgRow>(`SELECT COUNT(*) AS count FROM "ssoProvider"`);
      const row = result.rows[0];
      const value = row?.["count"];
      if (typeof value === "number") return value;
      if (typeof value === "string") return parseInt(value, 10) || 0;
      if (typeof value === "bigint") return Number(value);
      return 0;
    } catch {
      return 0;
    }
  }

  return {
    listByWorkspace,
    upsertOidc,
    upsertSaml,
    deleteProvider,
    countProviders,
    assertDomainsAvailable,
  };
}

export type SsoProviderStore = ReturnType<typeof createSsoProviderStore>;
