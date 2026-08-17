import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createWorkspaceStore } from "@/lib/auth/workspaces/store";
import { createSlackInboundStore, resolveSlackInboundUser } from "@/lib/chat/slack-inbound/store";
import { getPool, resetPoolForTests } from "@/lib/db/pool";
import { ensureBrainSchema } from "@/lib/db/schema";

const url = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

if (!url) {
  describe.skip("slack inbound identity (BRAIN_DATABASE_URL not set)", () => {
    it.skip("skipped", () => {});
  });
} else {
  describe("slack inbound identity", () => {
    const pool = getPool();

    beforeEach(async () => {
      await ensureBrainSchema(pool);
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
      await pool.query(`DELETE FROM "user" WHERE id LIKE 'slack-id-%'`);
    });

    afterAll(async () => {
      await resetPoolForTests();
    });

    it("upserts Slack user mapping and looks it up by team and user id", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personal = await workspaces.ensurePersonalWorkspace("slack-id-user-a");
      const store = createSlackInboundStore(pool);

      await store.upsertIdentity({
        userId: "slack-id-user-a",
        workspaceId: personal.id,
        slackTeamId: "T1",
        slackUserId: "U1",
      });

      const found = await store.lookupBySlackUser("T1", "U1");
      expect(found).toEqual({
        userId: "slack-id-user-a",
        workspaceId: personal.id,
        slackTeamId: "T1",
        slackUserId: "U1",
      });
    });

    it("deletes mapping for a user and workspace", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personal = await workspaces.ensurePersonalWorkspace("slack-id-user-a");
      const store = createSlackInboundStore(pool);
      await store.upsertIdentity({
        userId: "slack-id-user-a",
        workspaceId: personal.id,
        slackTeamId: "T1",
        slackUserId: "U1",
      });

      await store.deleteIdentity("slack-id-user-a", personal.id);
      expect(await store.lookupBySlackUser("T1", "U1")).toBeNull();
    });

    it("prefers stored Slack id over email", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personalA = await workspaces.ensurePersonalWorkspace("slack-id-user-a");
      await workspaces.ensurePersonalWorkspace("slack-id-user-b");
      const store = createSlackInboundStore(pool);
      await store.upsertIdentity({
        userId: "slack-id-user-a",
        workspaceId: personalA.id,
        slackTeamId: "T1",
        slackUserId: "U1",
      });

      await pool.query(
        `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, TRUE, NOW(), NOW())`,
        ["slack-id-user-b", "B", "mapped@example.com"],
      );

      const resolved = await resolveSlackInboundUser(pool, {
        slackTeamId: "T1",
        slackUserId: "U1",
        email: "mapped@example.com",
      });
      expect(resolved?.userId).toBe("slack-id-user-a");
    });

    it("refuses when email matches more than one Brain user", async () => {
      await expect(
        resolveSlackInboundUser(pool, {
          slackTeamId: "T9",
          slackUserId: "U9",
          email: "shared@example.com",
          findUsersByEmail: async () => [
            { id: "slack-id-user-a", email: "shared@example.com" },
            { id: "slack-id-user-b", email: "shared@example.com" },
          ],
        }),
      ).resolves.toBeNull();
    });

    it("stores a unique email match as identity", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personal = await workspaces.ensurePersonalWorkspace("slack-id-user-a");
      await pool.query(
        `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, TRUE, NOW(), NOW())`,
        ["slack-id-user-a", "A", "unique@example.com"],
      );
      const store = createSlackInboundStore(pool);
      const resolved = await resolveSlackInboundUser(pool, {
        slackTeamId: "T2",
        slackUserId: "U2",
        email: "unique@example.com",
      });
      expect(resolved).toEqual({
        userId: "slack-id-user-a",
        workspaceId: personal.id,
        slackTeamId: "T2",
        slackUserId: "U2",
      });
      expect(await store.lookupBySlackUser("T2", "U2")).toEqual(resolved);
    });
  });
}
