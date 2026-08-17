import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkspaceStore } from "@/lib/auth/workspaces/store";
import { handleSlackInboundMessage } from "@/lib/chat/slack-inbound/dispatch";
import { createSlackInboundStore } from "@/lib/chat/slack-inbound/store";
import { getChatStore } from "@/lib/chat/store";
import { getPool, resetPoolForTests } from "@/lib/db/pool";
import { ensureBrainSchema } from "@/lib/db/schema";

const url = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

function dispatchContext(overrides?: {
  readonly subscribed?: boolean;
  readonly mentioned?: boolean;
}) {
  return {
    isBotMentioned: () => overrides?.mentioned === true,
    isSubscribed: async () => overrides?.subscribed === true,
    reset: vi.fn(async () => ({ status: "reset" as const })),
    startTyping: vi.fn(async () => undefined),
    postPrivate: vi.fn<(userId: string, text: string) => Promise<void>>(async () => undefined),
    postPublic: vi.fn(async () => undefined),
  };
}

if (!url) {
  describe.skip("slack inbound dispatch (BRAIN_DATABASE_URL not set)", () => {
    it.skip("skipped", () => {});
  });
} else {
  describe("slack inbound dispatch", () => {
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

    it("drops bot authors without starting a turn", async () => {
      const ctx = { kind: "dm" as const, ...dispatchContext() };
      await expect(
        handleSlackInboundMessage(ctx, {
          text: "hello",
          ts: "1.0",
          threadTs: "1.0",
          channelId: "D1",
          teamId: "T1",
          author: { userId: "B1", isBot: true },
        }),
      ).resolves.toBeNull();
      expect(ctx.postPrivate).not.toHaveBeenCalled();
    });

    it("ignores unmentioned channel noise", async () => {
      const ctx = { kind: "message" as const, ...dispatchContext() };
      await expect(
        handleSlackInboundMessage(ctx, {
          text: "hello room",
          ts: "1.0",
          threadTs: "1.0",
          channelId: "C1",
          teamId: "T1",
          author: { userId: "U1", isBot: false },
        }),
      ).resolves.toBeNull();
    });

    it("refuses an unmapped user and does not dispatch", async () => {
      const ctx = { kind: "dm" as const, ...dispatchContext() };
      await expect(
        handleSlackInboundMessage(ctx, {
          text: "hello",
          ts: "1.0",
          threadTs: "1.0",
          channelId: "D1",
          teamId: "T1",
          author: { userId: "U-unknown", isBot: false },
        }),
      ).resolves.toBeNull();
      expect(ctx.postPrivate).toHaveBeenCalledOnce();
      expect(String(ctx.postPrivate.mock.calls[0]?.[1])).toMatch(/Connect Slack/i);
    });

    it("dispatches a mapped DM as the Brain principal", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personal = await workspaces.ensurePersonalWorkspace("slack-dispatch-user");
      await createSlackInboundStore(pool).upsertIdentity({
        userId: "slack-dispatch-user",
        workspaceId: personal.id,
        slackTeamId: "T1",
        slackUserId: "U1",
      });
      const ctx = { kind: "dm" as const, ...dispatchContext() };
      const result = await handleSlackInboundMessage(ctx, {
        text: "hello from slack",
        ts: "1.0",
        threadTs: "1.0",
        channelId: "D1",
        teamId: "T1",
        author: { userId: "U1", isBot: false },
      });
      expect(result?.auth?.principalId).toBe("slack-dispatch-user");
      expect(result?.auth?.authenticator).toBe("brain-session");
      expect(result?.auth?.attributes["source"]).toBe("slack-inbound");
      expect(result?.context?.[0]).toContain("Client context:");
      expect(result?.context?.[0]).not.toContain('"unattended":true');
    });

    it("resets on /new and does not send it to the model", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personal = await workspaces.ensurePersonalWorkspace("slack-dispatch-user");
      await createSlackInboundStore(pool).upsertIdentity({
        userId: "slack-dispatch-user",
        workspaceId: personal.id,
        slackTeamId: "T1",
        slackUserId: "U1",
      });
      const ctx = { kind: "dm" as const, ...dispatchContext() };
      const result = await handleSlackInboundMessage(ctx, {
        text: "/new",
        ts: "2.0",
        threadTs: "1.0",
        channelId: "D1",
        teamId: "T1",
        author: { userId: "U1", isBot: false },
      });
      expect(result).toBeNull();
      expect(ctx.reset).toHaveBeenCalledOnce();
      expect(ctx.postPublic).toHaveBeenCalledWith("Started a fresh conversation.");
    });

    it("reuses one personal chat for two DMs in the same thread", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personal = await workspaces.ensurePersonalWorkspace("slack-dispatch-user");
      await workspaces.ensurePersonalWorkspace("slack-dispatch-other");
      await createSlackInboundStore(pool).upsertIdentity({
        userId: "slack-dispatch-user",
        workspaceId: personal.id,
        slackTeamId: "T1",
        slackUserId: "U1",
      });
      const ctx = { kind: "dm" as const, ...dispatchContext() };
      const message = {
        text: "first",
        ts: "1.0",
        threadTs: "1.0",
        channelId: "D1",
        teamId: "T1",
        author: { userId: "U1", isBot: false },
      };
      await handleSlackInboundMessage(ctx, message);
      await handleSlackInboundMessage(ctx, { ...message, text: "second", ts: "1.1" });

      const chats = await getChatStore().listChats("slack-dispatch-user", personal.id);
      expect(chats).toHaveLength(1);
      const other = await getChatStore().listChats("slack-dispatch-other", personal.id);
      expect(other).toHaveLength(0);
    });

    it("remaps the thread to a new chat after /new", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personal = await workspaces.ensurePersonalWorkspace("slack-dispatch-user");
      await createSlackInboundStore(pool).upsertIdentity({
        userId: "slack-dispatch-user",
        workspaceId: personal.id,
        slackTeamId: "T1",
        slackUserId: "U1",
      });
      const ctx = { kind: "dm" as const, ...dispatchContext() };
      await handleSlackInboundMessage(ctx, {
        text: "first",
        ts: "1.0",
        threadTs: "1.0",
        channelId: "D1",
        teamId: "T1",
        author: { userId: "U1", isBot: false },
      });
      await handleSlackInboundMessage(ctx, {
        text: "/new",
        ts: "2.0",
        threadTs: "1.0",
        channelId: "D1",
        teamId: "T1",
        author: { userId: "U1", isBot: false },
      });
      const chats = await getChatStore().listChats("slack-dispatch-user", personal.id);
      expect(chats).toHaveLength(2);
    });
  });
}
