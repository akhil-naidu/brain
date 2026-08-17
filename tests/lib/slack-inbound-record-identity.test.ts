import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { brainUserPrincipal } from "@/lib/auth/principal";
import { createWorkspaceStore } from "@/lib/auth/workspaces/store";
import {
  forgetSlackIdentity,
  recordSlackIdentityFromUserToken,
} from "@/lib/chat/slack-inbound/record-identity";
import { createSlackInboundStore } from "@/lib/chat/slack-inbound/store";
import { getPool, resetPoolForTests } from "@/lib/db/pool";
import { ensureBrainSchema } from "@/lib/db/schema";

const url = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

const fetchAuthTest: typeof fetch = async () =>
  new Response(JSON.stringify({ ok: true, user_id: "U-auth", team_id: "T-auth" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

if (!url) {
  describe.skip("slack inbound record identity (BRAIN_DATABASE_URL not set)", () => {
    it.skip("skipped", () => {});
  });
} else {
  describe("record Slack identity from MCP token", () => {
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
    });

    afterAll(async () => {
      await resetPoolForTests();
    });

    it("upserts mapping from auth.test and clears it on disconnect", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personal = await workspaces.ensurePersonalWorkspace("slack-record-user");
      const principal = brainUserPrincipal("slack-record-user", personal.id);
      await expect(
        recordSlackIdentityFromUserToken(principal, { accessToken: "user-token" }, fetchAuthTest),
      ).resolves.toBe(true);

      const store = createSlackInboundStore(pool);
      expect(await store.lookupBySlackUser("T-auth", "U-auth")).toEqual({
        userId: "slack-record-user",
        workspaceId: personal.id,
        slackTeamId: "T-auth",
        slackUserId: "U-auth",
      });

      await forgetSlackIdentity(principal);
      expect(await store.lookupBySlackUser("T-auth", "U-auth")).toBeNull();
    });
  });
}
