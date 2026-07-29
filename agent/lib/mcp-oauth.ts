import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ConnectionPrincipal } from "eve/connections";

export type StoredToken = {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
};

type OAuthStore = {
  clients: Record<string, { clientId: string; clientSecret?: string }>;
  tokens: Record<string, StoredToken>;
};

export type McpOAuthProvider = {
  /** Connection/store name, e.g. "slack" */
  name: string;
  displayName: string;
  mcpUrl: string;
  /** RFC 8707 resource indicator; defaults to mcpUrl */
  resource?: string;
  /**
   * Space-delimited scopes. Pass `null` to omit the scope param
   * (required by Asana MCP apps).
   */
  scope: string | null;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  /** When set, register a public client per redirect URI (ClickUp-style). */
  registrationEndpoint?: string;
  /** Env var holding a pre-registered OAuth client id. */
  clientIdEnv?: string;
  /** Env var holding client secret (client_secret_post). */
  clientSecretEnv?: string;
  tokenAuthMethod: "none" | "client_secret_post";
  /** Extra authorize query params (e.g. Google access_type=offline). */
  authorizeExtraParams?: Record<string, string>;
  /** Providers like Slack wrap tokens in a proprietary JSON envelope. */
  parseTokenResponse?: (json: Record<string, unknown>) => {
    accessToken: string;
    expiresIn?: number;
    refreshToken?: string;
  };
};

function storePath(name: string): string {
  return path.join(process.cwd(), ".eve", `mcp-oauth-${name}.json`);
}

export function authorizeUrlPath(name: string): string {
  return path.join(process.cwd(), ".eve", `${name}-authorize-url.txt`);
}

function principalKey(principal: ConnectionPrincipal): string {
  if (principal.type === "app") return "app";
  return `user:${principal.issuer ?? ""}:${principal.id}`;
}

async function readStore(name: string): Promise<OAuthStore> {
  try {
    const raw = await readFile(storePath(name), "utf8");
    const parsed = JSON.parse(raw) as Partial<OAuthStore>;
    return {
      clients: parsed.clients ?? {},
      tokens: parsed.tokens ?? {},
    };
  } catch {
    return { clients: {}, tokens: {} };
  }
}

async function writeStore(name: string, store: OAuthStore): Promise<void> {
  await mkdir(path.dirname(storePath(name)), { recursive: true });
  await writeFile(storePath(name), `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export function makePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export async function getStoredAccessToken(
  provider: McpOAuthProvider,
  principal: ConnectionPrincipal,
): Promise<{ token: string; expiresAt?: number } | null> {
  const store = await readStore(provider.name);
  const entry = store.tokens[principalKey(principal)];
  if (!entry?.accessToken) return null;
  if (entry.expiresAt && entry.expiresAt <= Date.now() + 60_000) {
    return null;
  }
  return { token: entry.accessToken, expiresAt: entry.expiresAt };
}

export async function storeAccessToken(
  provider: McpOAuthProvider,
  principal: ConnectionPrincipal,
  token: StoredToken,
): Promise<void> {
  const store = await readStore(provider.name);
  store.tokens[principalKey(principal)] = token;
  await writeStore(provider.name, store);
}

async function resolveClient(
  provider: McpOAuthProvider,
  redirectUri: string,
): Promise<{ clientId: string; clientSecret?: string }> {
  const envClientId = provider.clientIdEnv
    ? process.env[provider.clientIdEnv]?.trim()
    : undefined;
  const envClientSecret = provider.clientSecretEnv
    ? process.env[provider.clientSecretEnv]?.trim()
    : undefined;

  if (envClientId) {
    return { clientId: envClientId, clientSecret: envClientSecret || undefined };
  }

  if (!provider.registrationEndpoint) {
    throw new Error(
      `${provider.displayName} requires ${provider.clientIdEnv} in .env (no dynamic client registration).`,
    );
  }

  const store = await readStore(provider.name);
  const existing = store.clients[redirectUri];
  if (existing?.clientId) return existing;

  const response = await fetch(provider.registrationEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_name: `brain-eve-${provider.name}`,
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: provider.tokenAuthMethod,
    }),
  });
  const body = (await response.json()) as {
    client_id?: string;
    client_secret?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !body.client_id) {
    throw new Error(
      `${provider.displayName} OAuth client registration failed: ${body.error_description ?? body.error ?? response.status}`,
    );
  }

  const client = {
    clientId: body.client_id,
    clientSecret: body.client_secret,
  };
  store.clients[redirectUri] = client;
  await writeStore(provider.name, store);
  return client;
}

export async function buildAuthorizeUrl(
  provider: McpOAuthProvider,
  opts: { callbackUrl: string; codeChallenge: string; state: string },
): Promise<{ url: string; clientId: string; clientSecret?: string }> {
  const client = await resolveClient(provider, opts.callbackUrl);
  const url = new URL(provider.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", client.clientId);
  url.searchParams.set("redirect_uri", opts.callbackUrl);
  url.searchParams.set("code_challenge", opts.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (provider.scope !== null) {
    url.searchParams.set("scope", provider.scope);
  }
  url.searchParams.set("resource", provider.resource ?? provider.mcpUrl);
  url.searchParams.set("state", opts.state);
  for (const [key, value] of Object.entries(provider.authorizeExtraParams ?? {})) {
    url.searchParams.set(key, value);
  }
  return { url: url.toString(), clientId: client.clientId, clientSecret: client.clientSecret };
}

export async function exchangeAuthorizationCode(
  provider: McpOAuthProvider,
  opts: {
    callbackUrl: string;
    code: string;
    codeVerifier: string;
    clientId: string;
    clientSecret?: string;
  },
): Promise<StoredToken> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.callbackUrl,
    client_id: opts.clientId,
    code_verifier: opts.codeVerifier,
    resource: provider.resource ?? provider.mcpUrl,
  });
  if (provider.tokenAuthMethod === "client_secret_post") {
    body.set("client_secret", opts.clientSecret ?? "");
  }

  const response = await fetch(provider.tokenEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });
  const json = (await response.json()) as Record<string, unknown>;

  let accessToken: string | undefined;
  let expiresIn: number | undefined;
  let refreshToken: string | undefined;

  if (provider.parseTokenResponse) {
    const parsed = provider.parseTokenResponse(json);
    accessToken = parsed.accessToken;
    expiresIn = parsed.expiresIn;
    refreshToken = parsed.refreshToken;
  } else {
    accessToken =
      typeof json.access_token === "string" ? json.access_token : undefined;
    expiresIn = typeof json.expires_in === "number" ? json.expires_in : undefined;
    refreshToken =
      typeof json.refresh_token === "string" ? json.refresh_token : undefined;
  }

  if (!response.ok || !accessToken) {
    throw new Error(
      `${provider.displayName} token exchange failed: ${String(json.error_description ?? json.error ?? response.status)} (${JSON.stringify(json)})`,
    );
  }

  return {
    accessToken,
    expiresAt:
      typeof expiresIn === "number" ? Date.now() + expiresIn * 1000 : undefined,
    refreshToken,
  };
}

/** Persist a single-line authorize URL and try to open it in the system browser. */
export async function publishAuthorizeUrl(
  provider: McpOAuthProvider,
  url: string,
  redirectUri: string,
): Promise<void> {
  const file = authorizeUrlPath(provider.name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(
    file,
    [
      url,
      "",
      `# If auth fails with redirect_uri mismatch, add this exact URI to your ${provider.displayName} OAuth app:`,
      redirectUri,
      "",
    ].join("\n"),
    "utf8",
  );

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
    // Browser open is best-effort.
  }
}
