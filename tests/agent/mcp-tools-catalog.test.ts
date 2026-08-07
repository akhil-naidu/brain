import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as ConnectionStatusModule from "@/agent/lib/connection-status";
import { buildMcpToolsCatalog } from "@/agent/lib/mcp-tools-catalog";
import { storeAccessToken, type McpOAuthProvider } from "@/agent/lib/mcp-oauth";
import { brainUserPrincipal } from "@/lib/auth/principal";

const originalCwd = process.cwd();
const temporaryDirectories: string[] = [];

vi.mock("@/agent/lib/connection-status", async () => {
  const actual = await vi.importActual<typeof ConnectionStatusModule>(
    "@/agent/lib/connection-status",
  );
  return {
    ...actual,
    CHAT_CONNECTION_PROVIDERS: [
      {
        name: "catalog-test",
        displayName: "Catalog Test",
        mcpUrl: "https://mcp.example.test/mcp",
        scope: "read",
        authorizationEndpoint: "https://example.test/authorize",
        tokenEndpoint: "https://example.test/token",
        clientIdEnv: "CATALOG_TEST_CLIENT_ID",
        clientSecretEnv: "CATALOG_TEST_CLIENT_SECRET",
        tokenAuthMethod: "client_secret_post" as const,
        safeReadOnlyTools: ["known_tool"],
      } satisfies McpOAuthProvider,
    ],
  };
});

async function useTemporaryWorkingDirectory(): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), "brain-mcp-tools-catalog-"));
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

describe("buildMcpToolsCatalog", () => {
  it("returns an empty catalog when nothing is connected", async () => {
    await useTemporaryWorkingDirectory();
    const catalog = await buildMcpToolsCatalog(
      brainUserPrincipal("user-a", "ws-a"),
      {},
      {
        statuses: [
          {
            id: "catalog-test",
            displayName: "Catalog Test",
            status: "needs_sign_in",
          },
        ],
      },
    );
    expect(catalog.connections).toEqual([]);
  });

  it("lists tools for a connected connection", async () => {
    await useTemporaryWorkingDirectory();
    const provider = {
      name: "catalog-test",
      displayName: "Catalog Test",
      mcpUrl: "https://mcp.example.test/mcp",
      scope: "read",
      authorizationEndpoint: "https://example.test/authorize",
      tokenEndpoint: "https://example.test/token",
      clientIdEnv: "CATALOG_TEST_CLIENT_ID",
      clientSecretEnv: "CATALOG_TEST_CLIENT_SECRET",
      tokenAuthMethod: "client_secret_post" as const,
      safeReadOnlyTools: ["known_tool"],
    } satisfies McpOAuthProvider;
    const principal = brainUserPrincipal("user-a", "ws-a");
    await storeAccessToken(provider, principal, { accessToken: "token-a" });

    const catalog = await buildMcpToolsCatalog(
      principal,
      {},
      {
        statuses: [
          {
            id: "catalog-test",
            displayName: "Catalog Test",
            status: "connected",
          },
        ],
        listTools: async () => [
          { name: "search_things", description: "Search things" },
          { name: "create_thing", description: "" },
        ],
      },
    );

    expect(catalog.connections).toEqual([
      {
        connectionId: "catalog-test",
        connectionName: "Catalog Test",
        tools: [
          { name: "search_things", description: "Search things" },
          { name: "create_thing", description: "" },
        ],
        error: null,
      },
    ]);
  });

  it("does not use another workspace grant", async () => {
    await useTemporaryWorkingDirectory();
    const provider = {
      name: "catalog-test",
      displayName: "Catalog Test",
      mcpUrl: "https://mcp.example.test/mcp",
      scope: "read",
      authorizationEndpoint: "https://example.test/authorize",
      tokenEndpoint: "https://example.test/token",
      clientIdEnv: "CATALOG_TEST_CLIENT_ID",
      clientSecretEnv: "CATALOG_TEST_CLIENT_SECRET",
      tokenAuthMethod: "client_secret_post" as const,
      safeReadOnlyTools: [],
    } satisfies McpOAuthProvider;
    await storeAccessToken(provider, brainUserPrincipal("user-a", "ws-a"), {
      accessToken: "token-a",
    });

    const catalog = await buildMcpToolsCatalog(
      brainUserPrincipal("user-a", "ws-b"),
      {},
      {
        statuses: [
          {
            id: "catalog-test",
            displayName: "Catalog Test",
            status: "connected",
          },
        ],
        listTools: async () => {
          throw new Error("should not list without token");
        },
      },
    );

    expect(catalog.connections).toEqual([
      {
        connectionId: "catalog-test",
        connectionName: "Catalog Test",
        tools: [],
        error: "Not connected for this workspace.",
      },
    ]);
  });

  it("surfaces list errors without inventing tools", async () => {
    await useTemporaryWorkingDirectory();
    const provider = {
      name: "catalog-test",
      displayName: "Catalog Test",
      mcpUrl: "https://mcp.example.test/mcp",
      scope: "read",
      authorizationEndpoint: "https://example.test/authorize",
      tokenEndpoint: "https://example.test/token",
      clientIdEnv: "CATALOG_TEST_CLIENT_ID",
      clientSecretEnv: "CATALOG_TEST_CLIENT_SECRET",
      tokenAuthMethod: "client_secret_post" as const,
      safeReadOnlyTools: [],
    } satisfies McpOAuthProvider;
    const principal = brainUserPrincipal("user-a", "ws-a");
    await storeAccessToken(provider, principal, { accessToken: "token-a" });

    const catalog = await buildMcpToolsCatalog(
      principal,
      {},
      {
        statuses: [
          {
            id: "catalog-test",
            displayName: "Catalog Test",
            status: "connected",
          },
        ],
        listTools: async () => {
          throw new Error("MCP server unreachable");
        },
      },
    );

    expect(catalog.connections[0]).toMatchObject({
      connectionId: "catalog-test",
      tools: [],
      error: "MCP server unreachable",
    });
  });
});
