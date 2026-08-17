import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Slack inbound channel", () => {
  it("uses portable eve slackChannel credentials without Vercel Connect", async () => {
    const source = await readFile(path.join(process.cwd(), "agent/channels/slack.ts"), "utf8");
    expect(source).toContain('from "eve/channels/slack"');
    expect(source).toContain("slackChannel");
    expect(source).not.toContain("@vercel/connect");
    expect(source).not.toContain("connectSlackCredentials");
  });
});
