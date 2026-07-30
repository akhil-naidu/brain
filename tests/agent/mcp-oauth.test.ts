import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ConnectionPrincipal } from "eve/connections";
import { afterEach, describe, expect, it, vi } from "vitest";
import { approvalForTool } from "../../agent/lib/define-mcp-oauth-connection";
import {
  exchangeAuthorizationCode,
  generateOAuthState,
  getStoredAccessToken,
  isTokenUsable,
  OAuthRequestError,
  parseStandardTokenResponse,
  storeAccessToken,
  verifyOAuthState,
  type McpOAuthProvider,
} from "../../agent/lib/mcp-oauth";

const originalCwd = process.cwd();
const temporaryDirectories: string[] = [];

const provider: McpOAuthProvider = {
  name: "test-provider",
  displayName: "Test Provider",
  mcpUrl: "https://mcp.example.test",
  scope: "read",
  authorizationEndpoint: "https://example.test/authorize",
  tokenEndpoint: "https://example.test/token",
  clientIdEnv: "TEST_MCP_CLIENT_ID",
  tokenAuthMethod: "none",
  safeReadOnlyTools: ["search_items", "get_item"],
};

const alice: ConnectionPrincipal = {
  type: "user",
  id: "alice",
  issuer: "test",
};

const bob: ConnectionPrincipal = {
  type: "user",
  id: "bob",
  issuer: "test",
};

async function useTemporaryWorkingDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "brain-oauth-test-"));
  temporaryDirectories.push(directory);
  process.chdir(directory);
  return directory;
}

afterEach(async () => {
  process.chdir(originalCwd);
  vi.unstubAllGlobals();
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("OAuth state", () => {
  it("generates unpredictable state and accepts only an exact match", () => {
    const first = generateOAuthState();
    const second = generateOAuthState();

    expect(first).not.toBe(second);
    expect(verifyOAuthState(first, first)).toBe(true);
    expect(verifyOAuthState(first, undefined)).toBe(false);
    expect(verifyOAuthState(first, `${first}x`)).toBe(false);
    expect(verifyOAuthState(first, second)).toBe(false);
  });
});

describe("token expiry", () => {
  it("treats tokens inside the clock-skew window as expired", () => {
    const now = 1_000_000;

    expect(isTokenUsable({ accessToken: "token" }, now)).toBe(true);
    expect(isTokenUsable({ accessToken: "token", expiresAt: now + 60_001 }, now)).toBe(true);
    expect(isTokenUsable({ accessToken: "token", expiresAt: now + 60_000 }, now)).toBe(false);
  });
});

describe("token response validation and redaction", () => {
  it("parses a valid standard token response", () => {
    expect(
      parseStandardTokenResponse({
        access_token: "access",
        expires_in: 3600,
        refresh_token: "refresh",
      }),
    ).toEqual({
      accessToken: "access",
      expiresIn: 3600,
      refreshToken: "refresh",
    });
  });

  it("rejects malformed token responses", () => {
    expect(() => parseStandardTokenResponse({ access_token: 42 })).toThrow("malformed_response");
  });

  it("never includes endpoint response secrets in errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response('{"error":"invalid_grant","refresh_token":"secret-value"}', {
            status: 400,
            headers: { "content-type": "application/json" },
          }),
      ),
    );

    const promise = exchangeAuthorizationCode(provider, {
      callbackUrl: "http://localhost/callback",
      code: "authorization-code",
      codeVerifier: "verifier",
      clientId: "client",
    });

    await expect(promise).rejects.toEqual(new OAuthRequestError("token_exchange_failed"));
    await expect(promise).rejects.not.toThrow("secret-value");
  });
});

describe("approval policy", () => {
  it("allows only explicitly reviewed read-only tools", () => {
    expect(
      approvalForTool("test-provider", provider.safeReadOnlyTools, "test-provider__search_items"),
    ).toBe("not-applicable");
    expect(
      approvalForTool("test-provider", provider.safeReadOnlyTools, "test-provider__delete_item"),
    ).toBe("user-approval");
    expect(
      approvalForTool("test-provider", provider.safeReadOnlyTools, "other__search_items"),
    ).toBe("user-approval");
  });
});

describe("OAuth store", () => {
  it("serializes concurrent updates and creates private files", async () => {
    const directory = await useTemporaryWorkingDirectory();
    const uniqueProvider = { ...provider, name: randomUUID() };

    await Promise.all([
      storeAccessToken(uniqueProvider, alice, { accessToken: "alice-token" }),
      storeAccessToken(uniqueProvider, bob, { accessToken: "bob-token" }),
    ]);

    await expect(getStoredAccessToken(uniqueProvider, alice)).resolves.toEqual({
      token: "alice-token",
      expiresAt: undefined,
    });
    await expect(getStoredAccessToken(uniqueProvider, bob)).resolves.toEqual({
      token: "bob-token",
      expiresAt: undefined,
    });

    const storeDirectory = path.join(directory, ".eve");
    const storeFile = path.join(storeDirectory, `mcp-oauth-${uniqueProvider.name}.json`);
    expect((await stat(storeDirectory)).mode & 0o777).toBe(0o700);
    expect((await stat(storeFile)).mode & 0o777).toBe(0o600);
  });

  it("fails loudly when the store is corrupt", async () => {
    const directory = await useTemporaryWorkingDirectory();
    const uniqueProvider = { ...provider, name: randomUUID() };
    const storeDirectory = path.join(directory, ".eve");
    await mkdir(storeDirectory, { recursive: true });
    const storeFile = path.join(storeDirectory, `mcp-oauth-${uniqueProvider.name}.json`);
    await writeFile(storeFile, "{not-json", "utf8");

    await expect(getStoredAccessToken(uniqueProvider, alice)).rejects.toThrow(
      "oauth_store_corrupt",
    );
    expect(await readFile(storeFile, "utf8")).toBe("{not-json");
  });

  it("coalesces refreshes and persists refresh-token rotation", async () => {
    const directory = await useTemporaryWorkingDirectory();
    const uniqueProvider = { ...provider, name: randomUUID() };
    await storeAccessToken(uniqueProvider, alice, {
      accessToken: "expired",
      expiresAt: Date.now() - 1,
      refreshToken: "old-refresh",
      clientId: "client",
    });
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "fresh",
            expires_in: 3600,
            refresh_token: "rotated-refresh",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      getStoredAccessToken(uniqueProvider, alice),
      getStoredAccessToken(uniqueProvider, alice),
    ]);

    expect(first).toEqual(second);
    expect(first?.token).toBe("fresh");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const storeFile = path.join(directory, ".eve", `mcp-oauth-${uniqueProvider.name}.json`);
    expect(await readFile(storeFile, "utf8")).toContain('"refreshToken": "rotated-refresh"');
  });

  it("evicts an expired grant when refresh fails", async () => {
    await useTemporaryWorkingDirectory();
    const uniqueProvider = { ...provider, name: randomUUID() };
    await storeAccessToken(uniqueProvider, alice, {
      accessToken: "expired",
      expiresAt: Date.now() - 1,
      refreshToken: "revoked-refresh",
      clientId: "client",
    });
    const fetchMock = vi.fn(
      async () =>
        new Response('{"error":"invalid_grant"}', {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getStoredAccessToken(uniqueProvider, alice)).resolves.toBeNull();
    await expect(getStoredAccessToken(uniqueProvider, alice)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
