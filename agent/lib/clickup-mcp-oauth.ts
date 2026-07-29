import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ConnectionPrincipal } from "eve/connections";

export const CLICKUP_MCP_URL = "https://mcp.clickup.com/mcp";
export const CLICKUP_MCP_RESOURCE = "https://mcp.clickup.com/mcp";
const AUTHORIZE_URL = "https://mcp.clickup.com/oauth/authorize";
const TOKEN_URL = "https://mcp.clickup.com/oauth/token";
const REGISTER_URL = "https://mcp.clickup.com/oauth/register";

const STORE_PATH = path.join(process.cwd(), ".eve", "clickup-mcp-oauth.json");
export const AUTHORIZE_URL_PATH = path.join(
  process.cwd(),
  ".eve",
  "clickup-authorize-url.txt",
);

type StoredToken = {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
};

type OAuthStore = {
  clients: Record<string, { clientId: string }>;
  tokens: Record<string, StoredToken>;
};

function principalKey(principal: ConnectionPrincipal): string {
  if (principal.type === "app") return "app";
  return `user:${principal.issuer ?? ""}:${principal.id}`;
}

async function readStore(): Promise<OAuthStore> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<OAuthStore>;
    return {
      clients: parsed.clients ?? {},
      tokens: parsed.tokens ?? {},
    };
  } catch {
    return { clients: {}, tokens: {} };
  }
}

async function writeStore(store: OAuthStore): Promise<void> {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export function makePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export async function getStoredAccessToken(
  principal: ConnectionPrincipal,
): Promise<{ token: string; expiresAt?: number } | null> {
  const store = await readStore();
  const entry = store.tokens[principalKey(principal)];
  if (!entry?.accessToken) return null;
  if (entry.expiresAt && entry.expiresAt <= Date.now() + 60_000) {
    return null;
  }
  return { token: entry.accessToken, expiresAt: entry.expiresAt };
}

export async function storeAccessToken(
  principal: ConnectionPrincipal,
  token: { accessToken: string; expiresAt?: number; refreshToken?: string },
): Promise<void> {
  const store = await readStore();
  store.tokens[principalKey(principal)] = {
    accessToken: token.accessToken,
    expiresAt: token.expiresAt,
    refreshToken: token.refreshToken,
  };
  await writeStore(store);
}

async function ensureClientId(redirectUri: string): Promise<string> {
  const store = await readStore();
  const existing = store.clients[redirectUri]?.clientId;
  if (existing) return existing;

  const response = await fetch(REGISTER_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_name: "brain-eve-agent",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });
  const body = (await response.json()) as {
    client_id?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !body.client_id) {
    throw new Error(
      `ClickUp OAuth client registration failed: ${body.error_description ?? body.error ?? response.status}`,
    );
  }

  store.clients[redirectUri] = { clientId: body.client_id };
  await writeStore(store);
  return body.client_id;
}

export async function buildAuthorizeUrl(opts: {
  callbackUrl: string;
  codeChallenge: string;
  state: string;
}): Promise<{ url: string; clientId: string }> {
  const clientId = await ensureClientId(opts.callbackUrl);
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", opts.callbackUrl);
  url.searchParams.set("code_challenge", opts.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", "read write");
  url.searchParams.set("resource", CLICKUP_MCP_RESOURCE);
  url.searchParams.set("state", opts.state);
  return { url: url.toString(), clientId };
}

export async function exchangeAuthorizationCode(opts: {
  callbackUrl: string;
  code: string;
  codeVerifier: string;
  clientId: string;
}): Promise<{ accessToken: string; expiresAt?: number; refreshToken?: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.callbackUrl,
    client_id: opts.clientId,
    code_verifier: opts.codeVerifier,
    resource: CLICKUP_MCP_RESOURCE,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });
  const json = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !json.access_token) {
    throw new Error(
      `ClickUp token exchange failed: ${json.error_description ?? json.error ?? response.status} (${JSON.stringify(json)})`,
    );
  }

  return {
    accessToken: json.access_token,
    expiresAt:
      typeof json.expires_in === "number"
        ? Date.now() + json.expires_in * 1000
        : undefined,
    refreshToken: json.refresh_token,
  };
}

/** Persist a single-line authorize URL and try to open it in the system browser. */
export async function publishAuthorizeUrl(url: string): Promise<void> {
  await mkdir(path.dirname(AUTHORIZE_URL_PATH), { recursive: true });
  await writeFile(AUTHORIZE_URL_PATH, `${url}\n`, "utf8");

  const { spawn } = await import("node:child_process");
  try {
    if (process.platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    } else if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
      }).unref();
    } else {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    }
  } catch {
    // Browser open is best-effort; the file path is the reliable fallback.
  }
}
