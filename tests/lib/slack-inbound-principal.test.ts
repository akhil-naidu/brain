import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { brainUserPrincipal } from "@/lib/auth/principal";
import { createWorkspaceStore } from "@/lib/auth/workspaces/store";
import { resolveBrainConnectionPrincipal } from "@/lib/chat/slack-inbound/principal";
import { createSlackInboundStore } from "@/lib/chat/slack-inbound/store";
import { getPool, resetPoolForTests } from "@/lib/db/pool";
import { ensureBrainSchema } from "@/lib/db/schema";

const url = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

if (!url) {
  describe.skip("slack inbound principal remap (BRAIN_DATABASE_URL not set)", () => {
    it.skip("skipped", () => {});
  });
} else {
  describe("resolveBrainConnectionPrincipal", () => {
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

    it("maps a Slack-webhook principal back to the Brain user", async () => {
      const workspaces = createWorkspaceStore(pool);
      const personal = await workspaces.ensurePersonalWorkspace("slack-principal-user");
      await createSlackInboundStore(pool).upsertIdentity({
        userId: "slack-principal-user",
        workspaceId: personal.id,
        slackTeamId: "T1",
        slackUserId: "U1",
      });
      const resolved = await resolveBrainConnectionPrincipal({
        type: "user",
        id: "slack:T1:U1",
        issuer: "slack:T1",
      });
      expect(resolved).toEqual(brainUserPrincipal("slack-principal-user", personal.id));
    });
  });
}
