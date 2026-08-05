import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  deleteStoredAppCredentials,
  getProviderCredentialSetupError,
  providerNeedsStaticAppCredentials,
  readStoredAppCredentials,
  resolveProviderAppCredentials,
  writeStoredAppCredentials,
} from "@/agent/lib/connection-credentials";
import type { McpOAuthProvider } from "@/agent/lib/mcp-oauth";

const originalCwd = process.cwd();
const temporaryDirectories: string[] = [];

const staticProvider: Pick<
  McpOAuthProvider,
  | "name"
  | "displayName"
  | "clientIdEnv"
  | "clientSecretEnv"
  | "registrationEndpoint"
  | "tokenAuthMethod"
> = {
  name: "slack",
  displayName: "Slack",
  clientIdEnv: "SLACK_MCP_CLIENT_ID",
  clientSecretEnv: "SLACK_MCP_CLIENT_SECRET",
  tokenAuthMethod: "client_secret_post",
};

const dcrProvider: Pick<McpOAuthProvider, "clientIdEnv" | "registrationEndpoint"> = {
  clientIdEnv: undefined,
  registrationEndpoint: "https://example.test/register",
};

async function useTemporaryWorkingDirectory(): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), "brain-connection-credentials-"));
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

describe("providerNeedsStaticAppCredentials", () => {
  it("is true for pre-registered OAuth apps and false for DCR", () => {
    expect(providerNeedsStaticAppCredentials(staticProvider)).toBe(true);
    expect(providerNeedsStaticAppCredentials(dcrProvider)).toBe(false);
  });
});

describe("stored app credentials", () => {
  it("writes readable credentials with restrictive permissions", async () => {
    await useTemporaryWorkingDirectory();
    await writeStoredAppCredentials("slack", {
      clientId: " id ",
      clientSecret: " secret ",
    });

    const stored = await readStoredAppCredentials("slack");
    expect(stored).toMatchObject({
      clientId: "id",
      clientSecret: "secret",
    });

    const filePath = path.join(process.cwd(), ".eve", "mcp-app-credentials-slack.json");
    const mode = (await stat(filePath)).mode & 0o777;
    expect(mode).toBe(0o600);
    expect(await readFile(filePath, "utf8")).toContain('"clientId": "id"');
  });

  it("prefers stored credentials over env", async () => {
    await useTemporaryWorkingDirectory();
    await writeStoredAppCredentials("slack", {
      clientId: "stored-id",
      clientSecret: "stored-secret",
    });

    const resolved = await resolveProviderAppCredentials(staticProvider, {
      SLACK_MCP_CLIENT_ID: "env-id",
      SLACK_MCP_CLIENT_SECRET: "env-secret",
    });
    expect(resolved).toEqual({
      clientId: "stored-id",
      clientSecret: "stored-secret",
      source: "stored",
    });
  });

  it("falls back to env when nothing is stored", async () => {
    await useTemporaryWorkingDirectory();
    const resolved = await resolveProviderAppCredentials(staticProvider, {
      SLACK_MCP_CLIENT_ID: "env-id",
      SLACK_MCP_CLIENT_SECRET: "env-secret",
    });
    expect(resolved).toEqual({
      clientId: "env-id",
      clientSecret: "env-secret",
      source: "env",
    });
  });

  it("deletes stored credentials", async () => {
    await useTemporaryWorkingDirectory();
    await writeStoredAppCredentials("slack", {
      clientId: "id",
      clientSecret: "secret",
    });
    await deleteStoredAppCredentials("slack");
    expect(await readStoredAppCredentials("slack")).toBeNull();
  });
});

describe("getProviderCredentialSetupError", () => {
  it("asks for credentials when none are configured", async () => {
    await useTemporaryWorkingDirectory();
    await expect(getProviderCredentialSetupError(staticProvider, {})).resolves.toBe(
      "Set up Slack to continue",
    );
  });

  it("asks for a client secret when id exists without secret", async () => {
    await useTemporaryWorkingDirectory();
    await writeStoredAppCredentials("slack", { clientId: "id" });
    await expect(getProviderCredentialSetupError(staticProvider, {})).resolves.toBe(
      "Add the Slack app secret to continue",
    );
  });

  it("returns null when credentials are complete", async () => {
    await useTemporaryWorkingDirectory();
    await writeStoredAppCredentials("slack", {
      clientId: "id",
      clientSecret: "secret",
    });
    await expect(getProviderCredentialSetupError(staticProvider, {})).resolves.toBeNull();
  });
});
