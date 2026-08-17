import { createHmac } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertHitlClickerIsSessionOwner,
  assertValidSlackSignature,
  extractHitlClicker,
  SlackInboundVerificationError,
} from "@/lib/chat/slack-inbound/verify";
import { createWorkspaceStore } from "@/lib/auth/workspaces/store";
import { createSlackInboundStore } from "@/lib/chat/slack-inbound/store";
import { getChatStore } from "@/lib/chat/store";
import { getPool, resetPoolForTests } from "@/lib/db/pool";
import { ensureBrainSchema } from "@/lib/db/schema";

const SECRET = "signing-secret";

function signedRequest(body: string, timestamp = Math.floor(Date.now() / 1000)): Request {
  const digest = createHmac("sha256", SECRET)
    .update(`v0:${timestamp}:${body}`, "utf8")
    .digest("hex");
  return new Request("https://brain.test/eve/v1/slack", {
    method: "POST",
    headers: {
      "x-slack-request-timestamp": String(timestamp),
      "x-slack-signature": `v0=${digest}`,
    },
    body,
  });
}

describe("Slack inbound signature verification", () => {
  it("rejects requests without Slack signature headers", () => {
    const request = new Request("https://brain.test/eve/v1/slack", { method: "POST", body: "{}" });
    expect(() => assertValidSlackSignature(request, "{}", SECRET)).toThrow(
      SlackInboundVerificationError,
    );
  });

  it("rejects a bad signature", () => {
    const body = '{"type":"url_verification","challenge":"abc"}';
    const request = new Request("https://brain.test/eve/v1/slack", {
      method: "POST",
      headers: {
        "x-slack-request-timestamp": String(Math.floor(Date.now() / 1000)),
        "x-slack-signature": "v0=deadbeef",
      },
      body,
    });
    expect(() => assertValidSlackSignature(request, body, SECRET)).toThrow(/mismatch/);
  });

  it("accepts a valid signed body", () => {
    const body = '{"type":"url_verification","challenge":"abc"}';
    expect(() => assertValidSlackSignature(signedRequest(body), body, SECRET)).not.toThrow();
  });
});

describe("HITL clicker extraction", () => {
  it("reads eve_input actions from a block_actions payload", () => {
    const clicker = extractHitlClicker({
      type: "block_actions",
      user: { id: "U-click" },
      team: { id: "T1" },
      channel: { id: "C1" },
      message: { ts: "1.0", thread_ts: "1.0" },
      actions: [{ action_id: "eve_input:req:button:0", value: "approve" }],
    });
    expect(clicker).toEqual({
      slackUserId: "U-click",
      slackTeamId: "T1",
      slackChannelId: "C1",
      slackThreadTs: "1.0",
    });
  });

  it("ignores non-HITL block actions", () => {
    expect(
      extractHitlClicker({
        type: "block_actions",
        user: { id: "U-click" },
        team: { id: "T1" },
        channel: { id: "C1" },
        message: { ts: "1.0" },
        actions: [{ action_id: "custom-button" }],
      }),
    ).toBeNull();
  });
});

const url = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

if (!url) {
  describe.skip("HITL clicker ownership (BRAIN_DATABASE_URL not set)", () => {
    it.skip("skipped", () => {});
  });
} else {
  describe("HITL clicker ownership", () => {
    const pool = getPool();

    beforeEach(async () => {
      await ensureBrainSchema(pool);
      await pool.query(`DELETE FROM chat_event`);
      await pool.query(`DELETE FROM chat`);
      await pool.query(`
        TRUNCATE brain_slack_thread_chat,
                 brain_slack_identity,
                 brain_workspace_invite,
                 brain_user_active_workspace,
                 brain_workspace_member,
                 brain_instance_admin,
                 brain_workspace
        RESTART IDENTITY CASCADE
      `);
    });

    afterAll(async () => {
      await resetPoolForTests();
    });

    it("rejects a foreign Slack user clicking Approve", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personal = await workspaces.ensurePersonalWorkspace("slack-hitl-owner");
      const store = createSlackInboundStore(pool);
      await store.upsertIdentity({
        userId: "slack-hitl-owner",
        workspaceId: personal.id,
        slackTeamId: "T1",
        slackUserId: "U-owner",
      });
      const chat = await getChatStore().createChat("slack-hitl-owner", {
        title: "Slack DM",
        workspaceId: personal.id,
      });
      await store.upsertThreadChat({
        slackTeamId: "T1",
        slackChannelId: "D1",
        slackThreadTs: "10.0",
        chatId: chat.id,
        userId: "slack-hitl-owner",
        workspaceId: personal.id,
      });

      await expect(
        assertHitlClickerIsSessionOwner({
          type: "block_actions",
          user: { id: "U-other" },
          team: { id: "T1" },
          channel: { id: "D1" },
          message: { ts: "10.0", thread_ts: "10.0" },
          actions: [{ action_id: "eve_input:req:button:0", value: "approve" }],
        }),
      ).rejects.toThrow(/session owner/);
    });

    it("allows the mapped session owner to click Approve", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personal = await workspaces.ensurePersonalWorkspace("slack-hitl-owner");
      const store = createSlackInboundStore(pool);
      await store.upsertIdentity({
        userId: "slack-hitl-owner",
        workspaceId: personal.id,
        slackTeamId: "T1",
        slackUserId: "U-owner",
      });
      const chat = await getChatStore().createChat("slack-hitl-owner", {
        title: "Slack DM",
        workspaceId: personal.id,
      });
      await store.upsertThreadChat({
        slackTeamId: "T1",
        slackChannelId: "D1",
        slackThreadTs: "10.0",
        chatId: chat.id,
        userId: "slack-hitl-owner",
        workspaceId: personal.id,
      });

      await expect(
        assertHitlClickerIsSessionOwner({
          type: "block_actions",
          user: { id: "U-owner" },
          team: { id: "T1" },
          channel: { id: "D1" },
          message: { ts: "10.0", thread_ts: "10.0" },
          actions: [{ action_id: "eve_input:req:button:0", value: "approve" }],
        }),
      ).resolves.toBeUndefined();
    });
  });
}
