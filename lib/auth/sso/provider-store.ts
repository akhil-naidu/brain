import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  assertValidEmailDomains,
  domainsFromStored,
  parseEmailDomains,
} from "@/lib/auth/sso/domains";
import { oidcSsoCallbackPath, samlSsoCallbackPath } from "@/lib/auth/sso/paths";

type SqlRow = Record<string, null | number | bigint | string | Uint8Array>;

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

function requireString(row: SqlRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected string column ${key}`);
  }
  return value;
}

function optionalString(row: SqlRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected string or null column ${key}`);
  }
  return value;
}

function parseJsonObject(value: string | null): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
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

function toPublic(row: SqlRow): PublicSsoProvider {
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
  };
}

function assertProviderId(providerId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(providerId)) {
    throw new Error("Provider ID may only contain letters, numbers, hyphens, and underscores.");
  }
}

export function createSsoProviderStore(db: DatabaseSync) {
  function listByWorkspace(workspaceId: string): PublicSsoProvider[] {
    const rows = db
      .prepare(
        `SELECT id, providerId, issuer, domain, oidcConfig, samlConfig, organizationId
         FROM ssoProvider
         WHERE organizationId = ?
         ORDER BY providerId ASC`,
      )
      .all(workspaceId) as SqlRow[];
    return rows.map(toPublic);
  }

  function getByProviderId(providerId: string): SqlRow | null {
    const row = db
      .prepare(
        `SELECT id, providerId, issuer, domain, oidcConfig, samlConfig, organizationId, userId
         FROM ssoProvider WHERE providerId = ?`,
      )
      .get(providerId) as SqlRow | undefined;
    return row ?? null;
  }

  function assertDomainsAvailable(domains: readonly string[], providerId: string): void {
    const rows = db.prepare(`SELECT providerId, domain FROM ssoProvider`).all() as SqlRow[];
    for (const row of rows) {
      const existingProviderId = requireString(row, "providerId");
      if (existingProviderId === providerId) {
        continue;
      }
      const taken = new Set(domainsFromStored(requireString(row, "domain")));
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
    assertDomainsAvailable(domains, input.providerId);

    const existing = getByProviderId(input.providerId);
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
      db.prepare(
        `UPDATE ssoProvider
         SET issuer = ?, domain = ?, oidcConfig = ?, samlConfig = NULL, organizationId = ?
         WHERE providerId = ?`,
      ).run(input.issuer, domain, oidcConfig, input.workspaceId, input.providerId);
    } else {
      db.prepare(
        `INSERT INTO ssoProvider
         (id, issuer, domain, oidcConfig, samlConfig, userId, providerId, organizationId)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
      ).run(
        randomUUID(),
        input.issuer,
        domain,
        oidcConfig,
        input.userId,
        input.providerId,
        input.workspaceId,
      );
    }
    const row = getByProviderId(input.providerId);
    if (!row) {
      throw new Error("Failed to persist OIDC SSO provider.");
    }
    return toPublic(row);
  }

  async function upsertSaml(input: SamlUpsertInput): Promise<PublicSsoProvider> {
    assertProviderId(input.providerId);
    const domains = parseEmailDomains([...input.domains]);
    assertValidEmailDomains(domains);
    assertDomainsAvailable(domains, input.providerId);

    const existing = getByProviderId(input.providerId);
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
      db.prepare(
        `UPDATE ssoProvider
         SET issuer = ?, domain = ?, oidcConfig = NULL, samlConfig = ?, organizationId = ?
         WHERE providerId = ?`,
      ).run(input.issuer, domain, samlConfig, input.workspaceId, input.providerId);
    } else {
      db.prepare(
        `INSERT INTO ssoProvider
         (id, issuer, domain, oidcConfig, samlConfig, userId, providerId, organizationId)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        input.issuer,
        domain,
        samlConfig,
        input.userId,
        input.providerId,
        input.workspaceId,
      );
    }
    const row = getByProviderId(input.providerId);
    if (!row) {
      throw new Error("Failed to persist SAML SSO provider.");
    }
    return toPublic(row);
  }

  function deleteProvider(providerId: string, workspaceId: string): void {
    const existing = getByProviderId(providerId);
    if (!existing) {
      throw new Error("SSO provider not found.");
    }
    if (optionalString(existing, "organizationId") !== workspaceId) {
      throw new Error("SSO provider not found in this workspace.");
    }
    db.prepare(`DELETE FROM ssoProvider WHERE providerId = ?`).run(providerId);
  }

  function countProviders(): number {
    try {
      const row = db.prepare(`SELECT COUNT(*) AS count FROM ssoProvider`).get() as
        SqlRow | undefined;
      const value = row?.["count"];
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "bigint") {
        return Number(value);
      }
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
