import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ANONYMOUS_CHAT_PRINCIPAL,
  resolveConnectionAuthStatus,
} from "@/agent/lib/connection-status";
import { storeAccessToken, type McpOAuthProvider } from "@/agent/lib/mcp-oauth";

const originalCwd = process.cwd();
const temporaryDirectories: string[] = [];

const provider: McpOAuthProvider = {
  name: "status-test",
  displayName: "Status Test",
  mcpUrl: "https://mcp.example.test",
  scope: "read",
  authorizationEndpoint: "https://example.test/authorize",
  tokenEndpoint: "https://example.test/token",
  clientIdEnv: "STATUS_TEST_CLIENT_ID",
  clientSecretEnv: "STATUS_TEST_CLIENT_SECRET",
  tokenAuthMethod: "client_secret_post",
  safeReadOnlyTools: [],
};

async function useTemporaryWorkingDirectory(): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), "brain-connection-status-"));
  temporaryDirectories.push(directory);
  process.chdir(directory);
}

afterEach(async () => {
  process.chdir(originalCwd);
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("resolveConnectionAuthStatus", () => {
  it("reports needs_setup when client credentials are missing", async () => {
    const status = await resolveConnectionAuthStatus(provider, ANONYMOUS_CHAT_PRINCIPAL, {});
    expect(status).toMatchObject({
      id: "status-test",
      status: "needs_setup",
      detail: "Set STATUS_TEST_CLIENT_ID",
    });
  });

  it("reports needs_sign_in when setup is complete but no token exists", async () => {
    await useTemporaryWorkingDirectory();
    const status = await resolveConnectionAuthStatus(provider, ANONYMOUS_CHAT_PRINCIPAL, {
      STATUS_TEST_CLIENT_ID: "id",
      STATUS_TEST_CLIENT_SECRET: "secret",
    });
    expect(status.status).toBe("needs_sign_in");
  });

  it("reports connected when a usable token exists", async () => {
    await useTemporaryWorkingDirectory();
    await storeAccessToken(provider, ANONYMOUS_CHAT_PRINCIPAL, {
      accessToken: "access",
      expiresAt: Date.now() + 120_000,
    });
    const status = await resolveConnectionAuthStatus(provider, ANONYMOUS_CHAT_PRINCIPAL, {
      STATUS_TEST_CLIENT_ID: "id",
      STATUS_TEST_CLIENT_SECRET: "secret",
    });
    expect(status.status).toBe("connected");
  });
});
