import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { bytebotHttpMcp, bytebotMcpUrl } from "@/agent/connections/bytebot";
import { mongodbHttpMcp, mongodbMcpUrl } from "@/agent/connections/mongodb";
import { rybbitHttpMcp, rybbitMcpUrl } from "@/agent/connections/rybbit";
import { toolboxHttpMcp } from "@/agent/connections/toolbox";
import { saveHostHttpMcpSetup } from "@/agent/lib/http-mcp-setup";
import {
  HTTP_MCP_URL_CONNECTIONS,
  isHttpMcpUrlConnectionId,
  listChatConnectionStatuses,
  resolveHttpMcpConnectionAuthStatus,
} from "@/agent/lib/connection-status";
import { approvalForTool } from "@/agent/lib/define-mcp-oauth-connection";
import {
  getHttpMcpCredentialSetupError,
  resolveHttpMcpCredentials,
  writeStoredHttpMcpCredentials,
} from "@/agent/lib/http-mcp-credentials";
import { mintHttpMcpProxyToken, verifyHttpMcpProxyToken } from "@/agent/lib/http-mcp-proxy-token";
import { parseHttpMcpServerUrl } from "@/agent/lib/http-mcp-url";
import { connectionOffersAppSetup, connectionUsesHttpMcpUrl } from "@/lib/chat/connection-catalog";
import {
  shouldOfferConnectionConfigure,
  shouldOfferConnectionDisconnect,
} from "@/lib/chat/connection-ui";
import { brainUserPrincipal } from "@/lib/auth/principal";

const originalCwd = process.cwd();
const temporaryDirectories: string[] = [];
const principal = brainUserPrincipal("user-a");

async function useTemporaryWorkingDirectory(): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), "brain-http-mcp-"));
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

describe("HTTP MCP URL connections", () => {
  it("registers MongoDB, Toolbox, Rybbit, and Bytebot behind the Brain proxy", () => {
    expect(HTTP_MCP_URL_CONNECTIONS.map((c) => c.name)).toEqual([
      "mongodb",
      "toolbox",
      "rybbit",
      "bytebot",
    ]);
    expect(isHttpMcpUrlConnectionId("mongodb")).toBe(true);
    expect(connectionUsesHttpMcpUrl("toolbox")).toBe(true);
    expect(connectionUsesHttpMcpUrl("rybbit")).toBe(true);
    expect(connectionUsesHttpMcpUrl("bytebot")).toBe(true);
    expect(connectionOffersAppSetup("mongodb")).toBe(true);
    expect(connectionOffersAppSetup("rybbit")).toBe(true);
    expect(mongodbMcpUrl).toContain("/api/mcp/http/mongodb");
    expect(rybbitMcpUrl).toContain("/api/mcp/http/rybbit");
    expect(bytebotMcpUrl).toContain("/api/mcp/http/bytebot");
    expect(HTTP_MCP_URL_CONNECTIONS.find((c) => c.name === "rybbit")?.requiresBearer).toBe(true);
    expect(
      HTTP_MCP_URL_CONNECTIONS.find((c) => c.name === "bytebot")?.requiresBearer,
    ).toBeUndefined();
    expect(parseHttpMcpServerUrl("https://db.example/mcp/")).toEqual({
      mcpUrl: "https://db.example/mcp",
    });
    expect(parseHttpMcpServerUrl("ftp://nope")).toBeNull();
  });

  it("reports needs_setup until an MCP URL is configured", async () => {
    await useTemporaryWorkingDirectory();
    const status = await resolveHttpMcpConnectionAuthStatus(mongodbHttpMcp, principal, {});
    expect(status).toMatchObject({
      id: "mongodb",
      status: "needs_setup",
      detail: "Set up MongoDB to continue",
    });
    expect(await getHttpMcpCredentialSetupError("toolbox", null, {})).toBe(
      "Set up MCP Toolbox to continue",
    );

    await writeStoredHttpMcpCredentials(mongodbHttpMcp, {
      mcpServerUrl: "https://mongo-mcp.example/mcp",
    });
    const connected = await resolveHttpMcpConnectionAuthStatus(mongodbHttpMcp, principal, {});
    expect(connected.status).toBe("connected");

    const statuses = await listChatConnectionStatuses(principal, {});
    expect(statuses.find((item) => item.id === "mongodb")?.status).toBe("connected");
    expect(statuses.find((item) => item.id === "toolbox")?.status).toBe("needs_setup");
  });

  it("resolves env URL fallback and optional bearer token", async () => {
    await useTemporaryWorkingDirectory();
    const resolved = await resolveHttpMcpCredentials("toolbox", null, {
      TOOLBOX_MCP_URL: "https://toolbox.example/mcp",
      TOOLBOX_MCP_TOKEN: "secret-token",
    });
    expect(resolved).toMatchObject({
      mcpServerUrl: "https://toolbox.example/mcp",
      bearerToken: "secret-token",
      source: "env",
    });
  });

  it("mints proxy tokens scoped to connection + workspace", () => {
    const env = { BETTER_AUTH_SECRET: "test-secret-value" };
    const token = mintHttpMcpProxyToken(
      { connectionId: "mongodb", workspaceId: "ws_1" },
      env,
      1_000,
    );
    expect(token).toBeTruthy();
    expect(verifyHttpMcpProxyToken(token!, env, 1_500)).toEqual({
      connectionId: "mongodb",
      workspaceId: "ws_1",
    });
    expect(verifyHttpMcpProxyToken(token!, env, 1_000 + 2 * 60 * 60 * 1000)).toBeNull();
  });

  it("offers Set up and hides Disconnect", () => {
    expect(
      shouldOfferConnectionConfigure(
        {
          id: "mongodb",
          displayName: "MongoDB",
          status: "needs_setup",
          canConfigureApp: true,
        },
        "mongodb",
      ),
    ).toBe(true);
    expect(
      shouldOfferConnectionDisconnect(
        { id: "mongodb", displayName: "MongoDB", status: "connected" },
        "mongodb",
      ),
    ).toBe(false);
  });

  it("auto-approves MongoDB read tools and gates writes", () => {
    expect(approvalForTool("mongodb", mongodbHttpMcp.safeReadOnlyTools, "mongodb__find")).toBe(
      "not-applicable",
    );
    expect(
      approvalForTool("mongodb", mongodbHttpMcp.safeReadOnlyTools, "mongodb__insert-many"),
    ).toBe("user-approval");
    expect(
      approvalForTool(
        "toolbox",
        toolboxHttpMcp.safeReadOnlyTools,
        "toolbox__search-hotels-by-name",
      ),
    ).toBe("user-approval");
  });

  it("requires a Rybbit API key even when the MCP URL is set", async () => {
    await useTemporaryWorkingDirectory();
    await writeStoredHttpMcpCredentials(rybbitHttpMcp, {
      mcpServerUrl: "https://app.rybbit.io/api/mcp",
    });
    expect(await getHttpMcpCredentialSetupError("rybbit", null, {})).toBe(
      "Set up Rybbit to continue",
    );
    const status = await resolveHttpMcpConnectionAuthStatus(rybbitHttpMcp, principal, {});
    expect(status.status).toBe("needs_setup");

    await writeStoredHttpMcpCredentials(rybbitHttpMcp, {
      mcpServerUrl: "https://app.rybbit.io/api/mcp",
      bearerToken: "rb_key",
    });
    expect(await getHttpMcpCredentialSetupError("rybbit", null, {})).toBeNull();
    const connected = await resolveHttpMcpConnectionAuthStatus(rybbitHttpMcp, principal, {});
    expect(connected.status).toBe("connected");
  });

  it("connects Bytebot with a URL and no token", async () => {
    await useTemporaryWorkingDirectory();
    await writeStoredHttpMcpCredentials(bytebotHttpMcp, {
      mcpServerUrl: "http://localhost:9990/mcp",
    });
    expect(await getHttpMcpCredentialSetupError("bytebot", null, {})).toBeNull();
    const status = await resolveHttpMcpConnectionAuthStatus(bytebotHttpMcp, principal, {});
    expect(status.status).toBe("connected");
  });

  it("rejects saving Rybbit without an API key", async () => {
    await useTemporaryWorkingDirectory();
    await expect(
      saveHostHttpMcpSetup("rybbit", { mcpServerUrl: "https://app.rybbit.io/api/mcp" }),
    ).rejects.toThrow(/API key/i);
  });

  it("auto-approves Rybbit reads and gates writes, query, and Bytebot desktop tools", () => {
    expect(approvalForTool("rybbit", rybbitHttpMcp.safeReadOnlyTools, "rybbit__list_sites")).toBe(
      "not-applicable",
    );
    expect(approvalForTool("rybbit", rybbitHttpMcp.safeReadOnlyTools, "rybbit__delete_site")).toBe(
      "user-approval",
    );
    expect(approvalForTool("rybbit", rybbitHttpMcp.safeReadOnlyTools, "rybbit__run_query")).toBe(
      "user-approval",
    );
    expect(
      approvalForTool("bytebot", bytebotHttpMcp.safeReadOnlyTools, "bytebot__screenshot"),
    ).toBe("user-approval");
    expect(
      shouldOfferConnectionDisconnect(
        { id: "rybbit", displayName: "Rybbit", status: "connected" },
        "rybbit",
      ),
    ).toBe(false);
    expect(
      shouldOfferConnectionDisconnect(
        { id: "bytebot", displayName: "Bytebot", status: "connected" },
        "bytebot",
      ),
    ).toBe(false);
  });
});
