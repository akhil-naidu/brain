import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  completeMenuConnectionAuthorization,
  disconnectMenuConnection,
  menuConnectionCallbackUrl,
  sanitizeUserIdForPendingPath,
  startMenuConnectionAuthorization,
} from "@/agent/lib/connection-authorize";
import {
  getStoredAccessToken,
  storeAccessToken,
  type McpOAuthProvider,
} from "@/agent/lib/mcp-oauth";
import { brainUserPrincipal } from "@/lib/auth/principal";

const originalCwd = process.cwd();
const temporaryDirectories: string[] = [];
const principal = brainUserPrincipal("user-a");
const principalB = brainUserPrincipal("user-b");

async function pendingFileExists(
  connectionName: string,
  userId: string,
  issuer = "brain",
): Promise<boolean> {
  try {
    await access(
      path.join(
        process.cwd(),
        ".eve",
        `mcp-oauth-pending-${connectionName}-${sanitizeUserIdForPendingPath(userId)}-${sanitizeUserIdForPendingPath(issuer)}.json`,
      ),
    );
    return true;
  } catch {
    return false;
  }
}

const provider: McpOAuthProvider = {
  name: "authorize-test",
  displayName: "Authorize Test",
  mcpUrl: "https://mcp.example.test",
  scope: "read",
  authorizationEndpoint: "https://example.test/authorize",
  tokenEndpoint: "https://example.test/token",
  clientIdEnv: "AUTHORIZE_TEST_CLIENT_ID",
  clientSecretEnv: "AUTHORIZE_TEST_CLIENT_SECRET",
  tokenAuthMethod: "client_secret_post",
  safeReadOnlyTools: [],
};

async function useTemporaryWorkingDirectory(): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), "brain-connection-authorize-"));
  temporaryDirectories.push(directory);
  process.chdir(directory);
}

afterEach(async () => {
  vi.unstubAllGlobals();
  process.chdir(originalCwd);
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("menuConnectionCallbackUrl", () => {
  it("builds a stable per-connection callback URL", () => {
    expect(menuConnectionCallbackUrl("http://localhost:3000", "slack")).toBe(
      "http://localhost:3000/api/connections/slack/callback",
    );
  });
});

describe("startMenuConnectionAuthorization", () => {
  it("rejects missing client credentials", async () => {
    await expect(
      startMenuConnectionAuthorization(
        provider,
        "http://localhost:3000/api/connections/authorize-test/callback",
        principal,
        {},
      ),
    ).rejects.toThrow("Set up Authorize Test to continue");
  });

  it("returns an authorize URL and stores pending state", async () => {
    await useTemporaryWorkingDirectory();
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_ID", "client-id");
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_SECRET", "client-secret");
    const callbackUrl = "http://localhost:3000/api/connections/authorize-test/callback";
    const result = await startMenuConnectionAuthorization(provider, callbackUrl, principal);

    expect(result.displayName).toBe("Authorize Test");
    expect(result.callbackUrl).toBe(callbackUrl);
    const url = new URL(result.authorizeUrl);
    expect(url.origin + url.pathname).toBe("https://example.test/authorize");
    expect(url.searchParams.get("redirect_uri")).toBe(callbackUrl);
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("state")).toBeTruthy();
  });
});

describe("completeMenuConnectionAuthorization", () => {
  it("exchanges a code and stores the token for the signed-in principal", async () => {
    await useTemporaryWorkingDirectory();
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_ID", "client-id");
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_SECRET", "client-secret");
    const callbackUrl = "http://localhost:3000/api/connections/authorize-test/callback";
    const started = await startMenuConnectionAuthorization(provider, callbackUrl, principal);
    const state = new URL(started.authorizeUrl).searchParams.get("state");
    expect(state).toBeTruthy();

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ access_token: "menu-token", expires_in: 3600 }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );

    const result = await completeMenuConnectionAuthorization(provider, {
      code: "auth-code",
      state: state!,
    });
    expect(result).toEqual({ ok: true, displayName: "Authorize Test" });
    await expect(getStoredAccessToken(provider, principal)).resolves.toMatchObject({
      token: "menu-token",
    });
    await expect(getStoredAccessToken(provider, brainUserPrincipal("user-b"))).resolves.toBeNull();
  });

  it("rejects mismatched state", async () => {
    await useTemporaryWorkingDirectory();
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_ID", "client-id");
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_SECRET", "client-secret");
    const callbackUrl = "http://localhost:3000/api/connections/authorize-test/callback";
    await startMenuConnectionAuthorization(provider, callbackUrl, principal);

    const result = await completeMenuConnectionAuthorization(provider, {
      code: "auth-code",
      state: "wrong-state",
    });
    expect(result).toMatchObject({ ok: false, retryable: true });
  });
});

describe("disconnectMenuConnection", () => {
  it("removes a stored token and is idempotent", async () => {
    await useTemporaryWorkingDirectory();
    await storeAccessToken(provider, principal, {
      accessToken: "to-remove",
      expiresAt: Date.now() + 120_000,
    });
    await expect(getStoredAccessToken(provider, principal)).resolves.toMatchObject({
      token: "to-remove",
    });

    await expect(disconnectMenuConnection(provider, principal)).resolves.toEqual({
      displayName: "Authorize Test",
    });
    await expect(getStoredAccessToken(provider, principal)).resolves.toBeNull();
    await expect(disconnectMenuConnection(provider, principal)).resolves.toEqual({
      displayName: "Authorize Test",
    });
  });

  it("does not clear another user’s pending authorize", async () => {
    await useTemporaryWorkingDirectory();
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_ID", "client-id");
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_SECRET", "client-secret");
    const callbackUrl = "http://localhost:3000/api/connections/authorize-test/callback";
    const startedA = await startMenuConnectionAuthorization(provider, callbackUrl, principal);
    await startMenuConnectionAuthorization(provider, callbackUrl, principalB);
    const stateA = new URL(startedA.authorizeUrl).searchParams.get("state");
    expect(stateA).toBeTruthy();

    await disconnectMenuConnection(provider, principalB);
    expect(await pendingFileExists(provider.name, "user-a")).toBe(true);
    expect(await pendingFileExists(provider.name, "user-b")).toBe(false);

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ access_token: "menu-token-a", expires_in: 3600 }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const result = await completeMenuConnectionAuthorization(provider, {
      code: "auth-code",
      state: stateA!,
    });
    expect(result).toEqual({ ok: true, displayName: "Authorize Test" });
    await expect(getStoredAccessToken(provider, principal)).resolves.toMatchObject({
      token: "menu-token-a",
    });
  });
});

describe("per-user pending authorize", () => {
  it("keeps concurrent pending states isolated", async () => {
    await useTemporaryWorkingDirectory();
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_ID", "client-id");
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_SECRET", "client-secret");
    const callbackUrl = "http://localhost:3000/api/connections/authorize-test/callback";
    const startedA = await startMenuConnectionAuthorization(provider, callbackUrl, principal);
    const startedB = await startMenuConnectionAuthorization(provider, callbackUrl, principalB);
    const stateA = new URL(startedA.authorizeUrl).searchParams.get("state");
    const stateB = new URL(startedB.authorizeUrl).searchParams.get("state");
    expect(stateA).toBeTruthy();
    expect(stateB).toBeTruthy();
    expect(stateA).not.toBe(stateB);
    expect(await pendingFileExists(provider.name, "user-a")).toBe(true);
    expect(await pendingFileExists(provider.name, "user-b")).toBe(true);

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ access_token: "token-b", expires_in: 3600 }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    await expect(
      completeMenuConnectionAuthorization(provider, { code: "code-b", state: stateB! }),
    ).resolves.toEqual({ ok: true, displayName: "Authorize Test" });
    expect(await pendingFileExists(provider.name, "user-a")).toBe(true);
    expect(await pendingFileExists(provider.name, "user-b")).toBe(false);
    await expect(getStoredAccessToken(provider, principalB)).resolves.toMatchObject({
      token: "token-b",
    });
    await expect(getStoredAccessToken(provider, principal)).resolves.toBeNull();
  });
});
