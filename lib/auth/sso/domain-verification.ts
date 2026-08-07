import { randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import type { Pool } from "pg";
import { domainsFromStored } from "@/lib/auth/sso/domains";

type PgRow = Record<string, unknown>;

const TOKEN_PREFIX = "better-auth-token";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function domainVerificationIdentifier(providerId: string): string {
  return `_${TOKEN_PREFIX}-${providerId}`;
}

export function domainVerificationDnsHost(providerId: string, domain: string): string {
  return `${domainVerificationIdentifier(providerId)}.${domain}`;
}

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

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

export function createDomainVerificationStore(pool: Pool) {
  async function getProvider(providerId: string): Promise<PgRow | null> {
    const result = await pool.query<PgRow>(
      `SELECT "providerId", domain, "organizationId", "domainVerified"
       FROM "ssoProvider" WHERE "providerId" = $1`,
      [providerId],
    );
    return result.rows[0] ?? null;
  }

  async function isDomainVerified(providerId: string): Promise<boolean> {
    const row = await getProvider(providerId);
    if (!row) return false;
    try {
      return asBool(row["domainVerified"]);
    } catch {
      return false;
    }
  }

  async function markUnverified(providerId: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE "ssoProvider" SET "domainVerified" = false WHERE "providerId" = $1`,
        [providerId],
      );
    } catch {
      // Column may not exist until Better Auth migrations run.
    }
  }

  async function markVerified(providerId: string): Promise<void> {
    await pool.query(`UPDATE "ssoProvider" SET "domainVerified" = true WHERE "providerId" = $1`, [
      providerId,
    ]);
  }

  async function findActiveToken(providerId: string): Promise<string | null> {
    const identifier = domainVerificationIdentifier(providerId);
    const result = await pool.query<PgRow>(
      `SELECT value, "expiresAt" FROM verification
       WHERE identifier = $1
       ORDER BY "createdAt" DESC
       LIMIT 1`,
      [identifier],
    );
    const row = result.rows[0];
    if (!row) return null;
    const value = optionalString(row, "value");
    const expiresAt = row["expiresAt"];
    const expiresMs =
      expiresAt instanceof Date
        ? expiresAt.getTime()
        : typeof expiresAt === "string"
          ? Date.parse(expiresAt)
          : NaN;
    if (!value || !Number.isFinite(expiresMs) || expiresMs <= Date.now()) return null;
    return value;
  }

  async function issueToken(providerId: string): Promise<string> {
    const existing = await findActiveToken(providerId);
    if (existing) return existing;
    const identifier = domainVerificationIdentifier(providerId);
    const token = randomBytes(18).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
    await pool.query(
      `INSERT INTO verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        randomBytes(16).toString("hex"),
        identifier,
        token,
        expiresAt.toISOString(),
        now.toISOString(),
        now.toISOString(),
      ],
    );
    await markUnverified(providerId);
    return token;
  }

  async function verifyProviderDomains(providerId: string): Promise<void> {
    const provider = await getProvider(providerId);
    if (!provider) throw new Error("SSO provider not found.");
    if (asBool(provider["domainVerified"])) throw new Error("Domain has already been verified.");
    const token = await findActiveToken(providerId);
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
    await markVerified(providerId);
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
