import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  completeMenuConnectionAuthorization,
  menuConnectionCallbackUrl,
  startMenuConnectionAuthorization,
} from "@/agent/lib/connection-authorize";
import { ANONYMOUS_CHAT_PRINCIPAL } from "@/agent/lib/connection-status";
import { getStoredAccessToken, type McpOAuthProvider } from "@/agent/lib/mcp-oauth";

const originalCwd = process.cwd();
const temporaryDirectories: string[] = [];

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
        {},
      ),
    ).rejects.toThrow("Set AUTHORIZE_TEST_CLIENT_ID");
  });

  it("returns an authorize URL and stores pending state", async () => {
    await useTemporaryWorkingDirectory();
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_ID", "client-id");
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_SECRET", "client-secret");
    const callbackUrl = "http://localhost:3000/api/connections/authorize-test/callback";
    const result = await startMenuConnectionAuthorization(provider, callbackUrl);

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
  it("exchanges a code and stores the token", async () => {
    await useTemporaryWorkingDirectory();
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_ID", "client-id");
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_SECRET", "client-secret");
    const callbackUrl = "http://localhost:3000/api/connections/authorize-test/callback";
    const started = await startMenuConnectionAuthorization(provider, callbackUrl);
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
    await expect(getStoredAccessToken(provider, ANONYMOUS_CHAT_PRINCIPAL)).resolves.toMatchObject({
      token: "menu-token",
    });
  });

  it("rejects mismatched state", async () => {
    await useTemporaryWorkingDirectory();
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_ID", "client-id");
    vi.stubEnv("AUTHORIZE_TEST_CLIENT_SECRET", "client-secret");
    const callbackUrl = "http://localhost:3000/api/connections/authorize-test/callback";
    await startMenuConnectionAuthorization(provider, callbackUrl);

    const result = await completeMenuConnectionAuthorization(provider, {
      code: "auth-code",
      state: "wrong-state",
    });
    expect(result).toMatchObject({ ok: false, retryable: true });
  });
});
