import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const licensePayloadSchema = z
  .object({
    maxUsers: z.number().int().positive().nullable(),
    sso: z.boolean(),
    multiWorkspace: z.boolean(),
    byoa: z.boolean(),
    openSignup: z.boolean(),
    issuedAt: z.string().min(1),
    expiresAt: z.string().nullable().optional(),
  })
  .strict();

export type LicensePayload = z.infer<typeof licensePayloadSchema>;

export type LicenseEntitlements = {
  readonly maxUsers: number | null;
  readonly sso: boolean;
  readonly multiWorkspace: boolean;
  readonly byoa: boolean;
  readonly openSignup: boolean;
  readonly source: "license" | "unlicensed";
  readonly expiresAt: string | null;
  readonly issuedAt: string | null;
};

const storedLicenseSchema = z
  .object({
    key: z.string().min(1),
    updatedAt: z.number().finite(),
  })
  .strict();

export const UNLICENSED_ENTITLEMENTS: LicenseEntitlements = {
  maxUsers: null,
  sso: true,
  multiWorkspace: true,
  byoa: true,
  openSignup: true,
  source: "unlicensed",
  expiresAt: null,
  issuedAt: null,
};

function licensePath(): string {
  return path.join(process.cwd(), ".eve", "brain-license.json");
}

function resolveLicenseSecret(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const dedicated = env["BRAIN_LICENSE_SECRET"]?.trim();
  if (dedicated) {
    return dedicated;
  }
  const fallback = env["BETTER_AUTH_SECRET"]?.trim();
  return fallback || null;
}

function base64UrlEncode(value: string | Buffer): string {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buffer.toString("base64url");
}

function base64UrlDecodeToString(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payloadJson: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadJson).digest("base64url");
}

function secretsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function createLicenseKey(
  payload: LicensePayload,
  env: Record<string, string | undefined> = process.env,
): string {
  const secret = resolveLicenseSecret(env);
  if (!secret) {
    throw new Error("Missing BRAIN_LICENSE_SECRET or BETTER_AUTH_SECRET to sign licenses.");
  }
  const parsed = licensePayloadSchema.parse(payload);
  const payloadJson = JSON.stringify(parsed);
  const body = base64UrlEncode(payloadJson);
  const signature = signPayload(payloadJson, secret);
  return `BRAIN1.${body}.${signature}`;
}

export function verifyLicenseKey(
  key: string,
  env: Record<string, string | undefined> = process.env,
  nowMs: number = Date.now(),
): LicensePayload {
  const secret = resolveLicenseSecret(env);
  if (!secret) {
    throw new Error("Missing BRAIN_LICENSE_SECRET or BETTER_AUTH_SECRET to verify licenses.");
  }
  const trimmed = key.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 3 || parts[0] !== "BRAIN1" || !parts[1] || !parts[2]) {
    throw new Error("Invalid license key format.");
  }
  let payloadJson: string;
  try {
    payloadJson = base64UrlDecodeToString(parts[1]);
  } catch {
    throw new Error("Invalid license key payload.");
  }
  const expected = signPayload(payloadJson, secret);
  if (!secretsEqual(expected, parts[2])) {
    throw new Error("Invalid license signature.");
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(payloadJson) as unknown;
  } catch {
    throw new Error("Invalid license key payload.");
  }
  const payload = licensePayloadSchema.parse(parsedJson);
  if (payload.expiresAt) {
    const expires = Date.parse(payload.expiresAt);
    if (!Number.isFinite(expires) || expires < nowMs) {
      throw new Error("License has expired.");
    }
  }
  return payload;
}

function entitlementsFromPayload(payload: LicensePayload): LicenseEntitlements {
  return {
    maxUsers: payload.maxUsers,
    sso: payload.sso,
    multiWorkspace: payload.multiWorkspace,
    byoa: payload.byoa,
    openSignup: payload.openSignup,
    source: "license",
    expiresAt: payload.expiresAt ?? null,
    issuedAt: payload.issuedAt,
  };
}

export async function readStoredLicenseKey(): Promise<string | null> {
  try {
    const raw = await readFile(licensePath(), "utf8");
    const parsed = storedLicenseSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data.key : null;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    return null;
  }
}

export async function writeStoredLicenseKey(key: string): Promise<void> {
  const destination = licensePath();
  const directory = path.dirname(destination);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const value = { key: key.trim(), updatedAt: Date.now() };
  const temporary = path.join(
    directory,
    `.${path.basename(destination)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
  );
  try {
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, destination);
    await chmod(destination, 0o600);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function clearStoredLicenseKey(): Promise<void> {
  await rm(licensePath(), { force: true });
}

export async function resolveLicenseEntitlements(
  env: Record<string, string | undefined> = process.env,
  nowMs: number = Date.now(),
): Promise<LicenseEntitlements> {
  const key = await readStoredLicenseKey();
  if (!key) {
    return UNLICENSED_ENTITLEMENTS;
  }
  try {
    return entitlementsFromPayload(verifyLicenseKey(key, env, nowMs));
  } catch {
    // Corrupt/expired on disk → behave as unlicensed rather than bricking the host.
    return UNLICENSED_ENTITLEMENTS;
  }
}

export function assertCanCreateUser(
  entitlements: LicenseEntitlements,
  currentUserCount: number,
): void {
  if (entitlements.maxUsers === null) {
    return;
  }
  if (currentUserCount >= entitlements.maxUsers) {
    throw new Error(
      `User limit reached (${entitlements.maxUsers}). Install a license with a higher maxUsers or remove users.`,
    );
  }
}

export function assertSignupModeAllowed(
  entitlements: LicenseEntitlements,
  signupMode: "open" | "invite-only" | "sso-only",
): void {
  if (signupMode === "open" && !entitlements.openSignup) {
    throw new Error("This license does not allow open signup.");
  }
  if (signupMode === "sso-only" && !entitlements.sso) {
    throw new Error("This license does not allow SSO-only signup mode.");
  }
}

export function assertMultiWorkspaceAllowed(entitlements: LicenseEntitlements): void {
  if (!entitlements.multiWorkspace) {
    throw new Error("This license does not allow creating additional workspaces.");
  }
}

export function assertByoaAllowed(entitlements: LicenseEntitlements): void {
  if (!entitlements.byoa) {
    throw new Error("This license does not allow workspace BYOA credentials.");
  }
}
