import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_PREFIX = "brain-snowflake-proxy.v1.";
const DEFAULT_TTL_MS = 60 * 60 * 1000;

function signingSecret(env: { readonly [key: string]: string | undefined }): string | null {
  const secret =
    env.BETTER_AUTH_SECRET?.trim() || env.BRAIN_INTERNAL_TOKEN?.trim() || env.AUTH_SECRET?.trim();
  return secret || null;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function mintSnowflakeProxyToken(
  input: { readonly workspaceId: string | null },
  env: { readonly [key: string]: string | undefined } = process.env,
  now = Date.now(),
): string | null {
  const secret = signingSecret(env);
  if (!secret) {
    return null;
  }
  const body = Buffer.from(
    JSON.stringify({
      w: input.workspaceId?.trim() || null,
      exp: now + DEFAULT_TTL_MS,
    }),
    "utf8",
  ).toString("base64url");
  return `${TOKEN_PREFIX}${body}.${sign(body, secret)}`;
}

export function verifySnowflakeProxyToken(
  token: string,
  env: { readonly [key: string]: string | undefined } = process.env,
  now = Date.now(),
): { readonly workspaceId: string | null } | null {
  const secret = signingSecret(env);
  if (!secret || !token.startsWith(TOKEN_PREFIX)) {
    return null;
  }
  const rest = token.slice(TOKEN_PREFIX.length);
  const dot = rest.lastIndexOf(".");
  if (dot <= 0) {
    return null;
  }
  const body = rest.slice(0, dot);
  const signature = rest.slice(dot + 1);
  const expected = sign(body, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const exp = "exp" in parsed ? parsed.exp : undefined;
    const workspaceRaw = "w" in parsed ? parsed.w : undefined;
    if (typeof exp !== "number" || !Number.isFinite(exp) || exp < now) {
      return null;
    }
    const workspaceId =
      typeof workspaceRaw === "string" && workspaceRaw.trim() ? workspaceRaw.trim() : null;
    return { workspaceId };
  } catch {
    return null;
  }
}
