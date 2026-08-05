import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ConnectionPrincipal } from "eve/connections";
import { z } from "zod";
import { resolveProviderAppCredentials } from "./connection-credentials";

const EXPIRY_SKEW_MS = 60_000;
const OAUTH_FETCH_TIMEOUT_MS = 15_000;

const storedTokenSchema = z
  .object({
    accessToken: z.string().min(1),
    expiresAt: z.number().finite().optional(),
    refreshToken: z.string().min(1).optional(),
    clientId: z.string().min(1).optional(),
    clientSecret: z.string().min(1).optional(),
  })
  .strict();

const oauthStoreSchema = z
  .object({
    clients: z.record(
      z.string(),
      z
        .object({
          clientId: z.string().min(1),
          clientSecret: z.string().min(1).optional(),
        })
        .strict(),
    ),
    tokens: z.record(z.string(), storedTokenSchema),
  })
  .strict();

const registrationResponseSchema = z
  .object({
    client_id: z.string().min(1),
    client_secret: z.string().min(1).optional(),
  })
  .passthrough();

const standardTokenResponseSchema = z
  .object({
    access_token: z.string().min(1),
    expires_in: z.number().finite().nonnegative().optional(),
    refresh_token: z.string().min(1).optional(),
  })
  .passthrough();

const jsonObjectSchema = z.record(z.string(), z.unknown());

export type StoredToken = {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
};

type OAuthStore = z.infer<typeof oauthStoreSchema>;

export type ParsedOAuthToken = {
  accessToken: string;
  expiresIn?: number;
  refreshToken?: string;
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
  /**
   * When false, omit RFC 8707 `resource` on authorize/token requests.
   * Classic GitHub OAuth apps do not accept that parameter.
   * Defaults to true.
   */
  includeResourceIndicator?: boolean;
  /** Providers like Slack wrap tokens in a proprietary JSON envelope. */
  parseTokenResponse?: (json: unknown) => ParsedOAuthToken;
  /** Exact remote tool names reviewed as read-only. Unknown tools require approval. */
  safeReadOnlyTools: readonly string[];
};

export class OAuthRequestError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "OAuthRequestError";
  }
}

const storeLocks = new Map<string, Promise<void>>();
const refreshes = new Map<string, Promise<{ token: string; expiresAt?: number } | null>>();

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

function emptyStore(): OAuthStore {
  return { clients: {}, tokens: {} };
}

async function readStore(name: string): Promise<OAuthStore> {
  try {
    const raw = await readFile(storePath(name), "utf8");
    const parsed: unknown = JSON.parse(raw);
    const result = oauthStoreSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error("oauth_store_corrupt");
    }
    return result.data;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code === "ENOENT"
    ) {
      return emptyStore();
    }
    if (error instanceof SyntaxError) {
      throw new Error("oauth_store_corrupt", { cause: error });
    }
    throw error;
  }
}

async function writeStore(name: string, store: OAuthStore): Promise<void> {
  const destination = storePath(name);
  const directory = path.dirname(destination);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);

  const temporary = path.join(
    directory,
    `.${path.basename(destination)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
  );
  try {
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(store, null, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, destination);
    await chmod(destination, 0o600);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

async function withStoreLock<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const previous = storeLocks.get(name) ?? Promise.resolve();
  const release = { current: () => {} };
  const gate = new Promise<void>((resolve) => {
    release.current = resolve;
  });
  const queued = previous.then(() => gate);
  storeLocks.set(name, queued);
  await previous;
  try {
    return await operation();
  } finally {
    release.current();
    if (storeLocks.get(name) === queued) {
      storeLocks.delete(name);
    }
  }
}

async function updateStore<T>(name: string, update: (store: OAuthStore) => T): Promise<T> {
  return withStoreLock(name, async () => {
    const store = await readStore(name);
    const result = update(store);
    await writeStore(name, store);
    return result;
  });
}

export function makePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function generateOAuthState(): string {
  return randomBytes(16).toString("base64url");
}

export function verifyOAuthState(expected: string, received: string | undefined): boolean {
  if (!received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return (
    expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes)
  );
}

export function isTokenUsable(token: StoredToken, now = Date.now()): boolean {
  return token.expiresAt === undefined || token.expiresAt > now + EXPIRY_SKEW_MS;
}

function tokenResult(token: StoredToken): { token: string; expiresAt?: number } {
  return { token: token.accessToken, expiresAt: token.expiresAt };
}

export type StoredTokenAuthState = "connected" | "needs_sign_in";

/**
 * Read-only peek of stored auth state. Does not refresh tokens over the network.
 * Refreshable-but-expired tokens count as connected.
 */
export async function getStoredTokenAuthState(
  provider: Pick<McpOAuthProvider, "name">,
  principal: ConnectionPrincipal,
): Promise<StoredTokenAuthState> {
  const store = await readStore(provider.name);
  const entry = store.tokens[principalKey(principal)];
  if (!entry) {
    return "needs_sign_in";
  }
  if (isTokenUsable(entry)) {
    return "connected";
  }
  if (entry.refreshToken && entry.clientId) {
    return "connected";
  }
  return "needs_sign_in";
}

export async function getStoredAccessToken(
  provider: McpOAuthProvider,
  principal: ConnectionPrincipal,
): Promise<{ token: string; expiresAt?: number } | null> {
  const store = await readStore(provider.name);
  const key = principalKey(principal);
  const entry = store.tokens[key];
  if (!entry) return null;
  if (isTokenUsable(entry)) return tokenResult(entry);
  if (!entry.refreshToken || !entry.clientId) {
    await deleteStoredTokenIfUnchanged(provider, principal, entry);
    return null;
  }

  const refreshKey = `${provider.name}:${key}`;
  const existingRefresh = refreshes.get(refreshKey);
  if (existingRefresh) return existingRefresh;

  const refresh = refreshStoredToken(provider, principal, entry).finally(() => {
    refreshes.delete(refreshKey);
  });
  refreshes.set(refreshKey, refresh);
  return refresh;
}

export async function storeAccessToken(
  provider: McpOAuthProvider,
  principal: ConnectionPrincipal,
  token: StoredToken,
): Promise<void> {
  await updateStore(provider.name, (store) => {
    store.tokens[principalKey(principal)] = token;
  });
}

export async function deleteStoredToken(
  provider: McpOAuthProvider,
  principal: ConnectionPrincipal,
): Promise<void> {
  await updateStore(provider.name, (store) => {
    delete store.tokens[principalKey(principal)];
  });
}

async function deleteStoredTokenIfUnchanged(
  provider: McpOAuthProvider,
  principal: ConnectionPrincipal,
  expected: StoredToken,
): Promise<void> {
  await updateStore(provider.name, (store) => {
    const current = store.tokens[principalKey(principal)];
    if (
      current?.accessToken === expected.accessToken &&
      current.refreshToken === expected.refreshToken
    ) {
      delete store.tokens[principalKey(principal)];
    }
  });
}

async function storeRefreshedTokenIfUnchanged(
  provider: McpOAuthProvider,
  principal: ConnectionPrincipal,
  expected: StoredToken,
  refreshed: StoredToken,
): Promise<boolean> {
  return updateStore(provider.name, (store) => {
    const key = principalKey(principal);
    const current = store.tokens[key];
    if (
      current?.accessToken !== expected.accessToken ||
      current.refreshToken !== expected.refreshToken
    ) {
      return false;
    }
    store.tokens[key] = refreshed;
    return true;
  });
}

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = jsonObjectSchema.safeParse(parsed);
    if (!result.success) throw new OAuthRequestError("malformed_response");
    return result.data;
  } catch (error) {
    if (error instanceof OAuthRequestError) throw error;
    throw new OAuthRequestError("malformed_response");
  }
}

async function readJsonObject(response: Response): Promise<Record<string, unknown>> {
  return parseJsonObject(await response.text());
}

async function fetchOAuth(url: string, init: RequestInit, failureCode: string): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new OAuthRequestError(failureCode);
  }
}

export function parseStandardTokenResponse(json: unknown): ParsedOAuthToken {
  const result = standardTokenResponseSchema.safeParse(json);
  if (!result.success) throw new OAuthRequestError("malformed_response");
  return {
    accessToken: result.data.access_token,
    expiresIn: result.data.expires_in,
    refreshToken: result.data.refresh_token,
  };
}

function parseProviderTokenResponse(
  provider: McpOAuthProvider,
  json: Record<string, unknown>,
): ParsedOAuthToken {
  try {
    return provider.parseTokenResponse
      ? provider.parseTokenResponse(json)
      : parseStandardTokenResponse(json);
  } catch (error) {
    if (error instanceof OAuthRequestError) throw error;
    throw new OAuthRequestError("malformed_response");
  }
}

function storedTokenFromResponse(
  parsed: ParsedOAuthToken,
  client: { clientId: string; clientSecret?: string },
  fallbackRefreshToken?: string,
): StoredToken {
  return {
    accessToken: parsed.accessToken,
    expiresAt: parsed.expiresIn === undefined ? undefined : Date.now() + parsed.expiresIn * 1000,
    refreshToken: parsed.refreshToken ?? fallbackRefreshToken,
    clientId: client.clientId,
    clientSecret: client.clientSecret,
  };
}

async function refreshStoredToken(
  provider: McpOAuthProvider,
  principal: ConnectionPrincipal,
  entry: StoredToken,
): Promise<{ token: string; expiresAt?: number } | null> {
  if (!entry.refreshToken || !entry.clientId) return null;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: entry.refreshToken,
    client_id: entry.clientId,
  });
  if (provider.includeResourceIndicator !== false) {
    body.set("resource", provider.resource ?? provider.mcpUrl);
  }
  if (provider.tokenAuthMethod === "client_secret_post") {
    body.set("client_secret", entry.clientSecret ?? "");
  }

  try {
    const response = await fetchOAuth(
      provider.tokenEndpoint,
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
        },
        body,
        signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
      },
      "token_refresh_failed",
    );
    const json = await readJsonObject(response);
    if (!response.ok) throw new OAuthRequestError("token_refresh_failed");
    const parsed = parseProviderTokenResponse(provider, json);
    const token = storedTokenFromResponse(
      parsed,
      { clientId: entry.clientId, clientSecret: entry.clientSecret },
      entry.refreshToken,
    );
    const stored = await storeRefreshedTokenIfUnchanged(provider, principal, entry, token);
    if (stored) return tokenResult(token);
    const latest = await readStore(provider.name);
    const current = latest.tokens[principalKey(principal)];
    return current && isTokenUsable(current) ? tokenResult(current) : null;
  } catch {
    await deleteStoredTokenIfUnchanged(provider, principal, entry);
    return null;
  }
}

async function resolveClient(
  provider: McpOAuthProvider,
  redirectUri: string,
): Promise<{ clientId: string; clientSecret?: string }> {
  const appCredentials = await resolveProviderAppCredentials(provider);
  if (appCredentials?.clientId) {
    return {
      clientId: appCredentials.clientId,
      clientSecret: appCredentials.clientSecret,
    };
  }

  if (!provider.registrationEndpoint) {
    throw new Error(`${provider.displayName} needs to be set up in the connections menu first.`);
  }

  const store = await readStore(provider.name);
  const existing = store.clients[redirectUri];
  if (existing?.clientId) return existing;

  const response = await fetchOAuth(
    provider.registrationEndpoint,
    {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        client_name: `brain-eve-${provider.name}`,
        redirect_uris: [redirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: provider.tokenAuthMethod,
      }),
      signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
    },
    "client_registration_failed",
  );
  const json = await readJsonObject(response);
  if (!response.ok) throw new OAuthRequestError("client_registration_failed");
  const parsed = registrationResponseSchema.safeParse(json);
  if (!parsed.success) throw new OAuthRequestError("malformed_response");

  const client = {
    clientId: parsed.data.client_id,
    clientSecret: parsed.data.client_secret,
  };
  await updateStore(provider.name, (latest) => {
    latest.clients[redirectUri] = client;
  });
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
  if (provider.includeResourceIndicator !== false) {
    url.searchParams.set("resource", provider.resource ?? provider.mcpUrl);
  }
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
  });
  if (provider.includeResourceIndicator !== false) {
    body.set("resource", provider.resource ?? provider.mcpUrl);
  }
  if (provider.tokenAuthMethod === "client_secret_post") {
    body.set("client_secret", opts.clientSecret ?? "");
  }

  const response = await fetchOAuth(
    provider.tokenEndpoint,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body,
      signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
    },
    "token_exchange_failed",
  );
  const json = await readJsonObject(response);
  if (!response.ok) throw new OAuthRequestError("token_exchange_failed");
  const parsed = parseProviderTokenResponse(provider, json);
  return storedTokenFromResponse(parsed, {
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  });
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
    let child;
    if (process.platform === "darwin") {
      child = spawn("open", [url], { detached: true, stdio: "ignore" });
    } else if (process.platform === "win32") {
      child = spawn("cmd", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
      });
    } else {
      child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
    }
    child.once("error", () => {
      console.error(`Could not open a browser. Open this URL: ${url}`);
    });
    child.unref();
  } catch {
    console.error(`Could not open a browser. Open this URL: ${url}`);
  }
}
