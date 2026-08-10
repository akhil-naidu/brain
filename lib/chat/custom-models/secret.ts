import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";
const ALGO = "aes-256-gcm";

function resolveSecret(env: Record<string, string | undefined>): string {
  const secret = env["BETTER_AUTH_SECRET"]?.trim();
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required to encrypt custom model API keys.");
  }
  return secret;
}

function deriveKey(env: Record<string, string | undefined>): Buffer {
  return createHash("sha256").update(resolveSecret(env)).digest();
}

/** Encrypt a custom-model API key for Postgres storage. */
export function encryptCustomModelApiKey(
  plaintext: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, deriveKey(env), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

/** Decrypt a custom-model API key ciphertext. */
export function decryptCustomModelApiKey(
  ciphertext: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const parts = ciphertext.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Unsupported custom model API key ciphertext.");
  }
  const iv = Buffer.from(parts[1] ?? "", "base64url");
  const tag = Buffer.from(parts[2] ?? "", "base64url");
  const encrypted = Buffer.from(parts[3] ?? "", "base64url");
  const decipher = createDecipheriv(ALGO, deriveKey(env), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
