import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  deleteSlackInboundCredentials,
  readSlackInboundStoredAllowlist,
  resolveSlackInboundCredentials,
  slackInboundCredentialStatus,
  writeSlackInboundCredentials,
} from "@/agent/lib/slack-inbound-credentials";

const originalCwd = process.cwd();
const temporaryDirectories: string[] = [];

async function useTemporaryWorkingDirectory(): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), "brain-slack-inbound-creds-"));
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

describe("Slack inbound credentials", () => {
  it("prefers stored host credentials over env", async () => {
    await useTemporaryWorkingDirectory();
    await writeSlackInboundCredentials({
      botToken: "xoxb-stored",
      signingSecret: "stored-secret",
    });
    const resolved = await resolveSlackInboundCredentials({
      SLACK_BOT_TOKEN: "xoxb-env",
      SLACK_SIGNING_SECRET: "env-secret",
    });
    expect(resolved).toEqual({
      botToken: "xoxb-stored",
      signingSecret: "stored-secret",
      source: "stored",
    });
    const filePath = path.join(process.cwd(), ".eve", "slack-inbound-credentials.json");
    expect((await stat(filePath)).mode & 0o777).toBe(0o600);
    expect(await readFile(filePath, "utf8")).toContain("xoxb-stored");
  });

  it("falls back to env when nothing is stored", async () => {
    await useTemporaryWorkingDirectory();
    await expect(
      resolveSlackInboundCredentials({
        SLACK_BOT_TOKEN: "xoxb-env",
        SLACK_SIGNING_SECRET: "env-secret",
      }),
    ).resolves.toEqual({
      botToken: "xoxb-env",
      signingSecret: "env-secret",
      source: "env",
    });
  });

  it("status never includes the signing secret", async () => {
    await useTemporaryWorkingDirectory();
    await writeSlackInboundCredentials({
      botToken: "xoxb-stored",
      signingSecret: "super-secret",
    });
    const status = await slackInboundCredentialStatus();
    expect(status).toEqual({
      hasBotToken: true,
      hasSigningSecret: true,
      source: "stored",
    });
    expect(JSON.stringify(status)).not.toContain("super-secret");
  });

  it("does not fall back to Vercel Connect when credentials are missing", async () => {
    await useTemporaryWorkingDirectory();
    await expect(resolveSlackInboundCredentials({})).resolves.toBeNull();
  });

  it("writes an allowlist without requiring tokens", async () => {
    await useTemporaryWorkingDirectory();
    await writeSlackInboundCredentials({ allowedChannelIds: [] });
    await expect(readSlackInboundStoredAllowlist()).resolves.toEqual([]);
    await writeSlackInboundCredentials({ allowedChannelIds: ["C-ok"] });
    await expect(readSlackInboundStoredAllowlist()).resolves.toEqual(["C-ok"]);
  });

  it("keeps the allowlist when stored tokens are removed", async () => {
    await useTemporaryWorkingDirectory();
    await writeSlackInboundCredentials({
      botToken: "xoxb-stored",
      signingSecret: "stored-secret",
      allowedChannelIds: ["C-ok"],
    });
    await deleteSlackInboundCredentials();
    await expect(readSlackInboundStoredAllowlist()).resolves.toEqual(["C-ok"]);
    await expect(resolveSlackInboundCredentials({})).resolves.toBeNull();
  });
});
