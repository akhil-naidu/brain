import { randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import type { DatabaseSync } from "node:sqlite";
import { domainsFromStored } from "@/lib/auth/sso/domains";

type SqlRow = Record<string, null | number | bigint | string | Uint8Array>;

const TOKEN_PREFIX = "better-auth-token";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function domainVerificationIdentifier(providerId: string): string {
  return `_${TOKEN_PREFIX}-${providerId}`;
}

export function domainVerificationDnsHost(providerId: string, domain: string): string {
  return `${domainVerificationIdentifier(providerId)}.${domain}`;
}

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

function asBool(value: unknown): boolean {
  return value === 1 || value === true || value === "1";
}

export function createDomainVerificationStore(db: DatabaseSync) {
  function getProvider(providerId: string): SqlRow | null {
    const row = db
      .prepare(
        `SELECT providerId, domain, organizationId, domainVerified
         FROM ssoProvider WHERE providerId = ?`,
      )
      .get(providerId) as SqlRow | undefined;
    return row ?? null;
  }

  function isDomainVerified(providerId: string): boolean {
    const row = getProvider(providerId);
    if (!row) {
      return false;
    }
    try {
      return asBool(row["domainVerified"]);
    } catch {
      return false;
    }
  }

  function markUnverified(providerId: string): void {
    try {
      db.prepare(`UPDATE ssoProvider SET domainVerified = 0 WHERE providerId = ?`).run(providerId);
    } catch {
      // Column may not exist until migrations run with domainVerification enabled.
    }
  }

  function markVerified(providerId: string): void {
    db.prepare(`UPDATE ssoProvider SET domainVerified = 1 WHERE providerId = ?`).run(providerId);
  }

  function findActiveToken(providerId: string): string | null {
    const identifier = domainVerificationIdentifier(providerId);
    const row = db
      .prepare(
        `SELECT value, expiresAt FROM verification
         WHERE identifier = ?
         ORDER BY createdAt DESC
         LIMIT 1`,
      )
      .get(identifier) as SqlRow | undefined;
    if (!row) {
      return null;
    }
    const value = optionalString(row, "value");
    const expiresAt = row["expiresAt"];
    const expiresMs =
      typeof expiresAt === "number"
        ? expiresAt
        : typeof expiresAt === "string"
          ? Date.parse(expiresAt)
          : NaN;
    if (!value || !Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
      return null;
    }
    return value;
  }

  function issueToken(providerId: string): string {
    const existing = findActiveToken(providerId);
    if (existing) {
      return existing;
    }
    const identifier = domainVerificationIdentifier(providerId);
    const token = randomBytes(18).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
    db.prepare(
      `INSERT INTO verification (id, identifier, value, expiresAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      randomBytes(16).toString("hex"),
      identifier,
      token,
      expiresAt.toISOString(),
      now.toISOString(),
      now.toISOString(),
    );
    markUnverified(providerId);
    return token;
  }

  async function verifyProviderDomains(providerId: string): Promise<void> {
    const provider = getProvider(providerId);
    if (!provider) {
      throw new Error("SSO provider not found.");
    }
    if (asBool(provider["domainVerified"])) {
      throw new Error("Domain has already been verified.");
    }
    const token = findActiveToken(providerId);
    if (!token) {
      throw new Error("No pending domain verification exists. Request a token first.");
    }
    const identifier = domainVerificationIdentifier(providerId);
    const domains = domainsFromStored(requireString(provider, "domain"));
    const expectedJoined = `${identifier}=${token}`;
    const lookups = await Promise.all(
      domains.map(async (domain) => {
        const host = domainVerificationDnsHost(providerId, domain);
        let records: string[] = [];
        try {
          records = (await resolveTxt(host)).map((parts) => parts.join(""));
        } catch {
          records = [];
        }
        const matched = records.some((record) => {
          const normalized = record.trim();
          return normalized === expectedJoined || normalized === token;
        });
        return { domain, matched };
      }),
    );
    const failed = lookups.find((entry) => !entry.matched);
    if (failed) {
      throw new Error(
        `Unable to verify domain ownership for ${failed.domain}. Publish the TXT record and try again.`,
      );
    }
    markVerified(providerId);
  }

  return {
    getProvider,
    isDomainVerified,
    markUnverified,
    issueToken,
    findActiveToken,
    verifyProviderDomains,
  };
}

export type DomainVerificationStore = ReturnType<typeof createDomainVerificationStore>;
