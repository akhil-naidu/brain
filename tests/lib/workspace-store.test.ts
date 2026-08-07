import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createWorkspaceStore } from "@/lib/auth/workspaces/store";
import { getPool, resetPoolForTests } from "@/lib/db/pool";
import { ensureBrainSchema } from "@/lib/db/schema";

const url = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

if (!url) {
  describe("workspace store (Postgres)", () => {
    it.skip("BRAIN_DATABASE_URL not set — skipping Postgres workspace store tests", () => {});
  });
} else {
  describe("workspace store", () => {
    const pool = getPool();

    beforeEach(async () => {
      await ensureBrainSchema(pool);
      // Truncate brain-owned tables; preserve ordering due to FK constraints.
      await pool.query(`
        TRUNCATE brain_workspace_invite,
                 brain_user_active_workspace,
                 brain_workspace_member,
                 brain_instance_admin,
                 brain_workspace
        RESTART IDENTITY CASCADE
      `);
      // Reset policy row to defaults.
      await pool.query(`
        UPDATE brain_instance_policy
        SET signup_mode = 'invite-only',
            auto_personal_workspace = TRUE,
            allow_create_workspace = TRUE,
            allow_forgot_password = TRUE
        WHERE id = 1
      `);
    });

    afterAll(async () => {
      await resetPoolForTests();
    });

    function openStore() {
      return createWorkspaceStore(pool);
    }

    it("seeds invite-only policies and personal workspace", async () => {
      const store = openStore();
      expect((await store.getPolicies()).signupMode).toBe("invite-only");
      const personal = await store.ensurePersonalWorkspace("user-1");
      expect(personal.kind).toBe("personal");
      await store.setActiveWorkspaceId("user-1", personal.id);
      expect((await store.resolveActiveWorkspace("user-1")).id).toBe(personal.id);
    });

    it("creates team workspace and isolates membership", async () => {
      const store = openStore();
      await store.ensurePersonalWorkspace("user-1");
      const team = await store.createWorkspace({
        name: "Acme",
        kind: "team",
        ownerUserId: "user-1",
      });
      expect(await store.getMembership(team.id, "user-1")).toBe("owner");
      expect(await store.getMembership(team.id, "user-2")).toBeNull();
    });

    it("accepts and revokes invites", async () => {
      const store = openStore();
      await store.ensurePersonalWorkspace("owner");
      const team = await store.createWorkspace({
        name: "Team",
        kind: "team",
        ownerUserId: "owner",
      });
      const invite = await store.createInvite({
        workspaceId: team.id,
        createdByUserId: "owner",
        email: "member@example.com",
      });
      await store.ensurePersonalWorkspace("member");
      const joined = await store.acceptInvite(invite.token, "member", "member@example.com");
      expect(joined.id).toBe(team.id);
      expect(await store.getMembership(team.id, "member")).toBe("member");

      const invite2 = await store.createInvite({
        workspaceId: team.id,
        createdByUserId: "owner",
      });
      expect(await store.revokeInvite(team.id, invite2.id, "owner")).toBe(true);
      await expect(store.acceptInvite(invite2.token, "other", "other@example.com")).rejects.toThrow(
        /revoked|invalid/i,
      );
    });

    it("gates create workspace via policy", async () => {
      const store = openStore();
      await store.updatePolicies({ allowCreateWorkspace: false });
      expect((await store.getPolicies()).allowCreateWorkspace).toBe(false);
    });

    it("defaults allow forgot password and persists toggles", async () => {
      const store = openStore();
      expect((await store.getPolicies()).allowForgotPassword).toBe(true);
      await store.updatePolicies({ allowForgotPassword: false });
      expect((await store.getPolicies()).allowForgotPassword).toBe(false);
    });

    it("lists members and updates roles with guards", async () => {
      const store = openStore();
      const team = await store.createWorkspace({
        name: "Team",
        kind: "team",
        ownerUserId: "owner",
      });
      await store.addMember(team.id, "member", "member");
      await store.addMember(team.id, "admin", "admin");

      expect((await store.listMembers(team.id)).length).toBe(3);
      expect(
        (
          await store.updateMemberRole({
            workspaceId: team.id,
            actorUserId: "owner",
            targetUserId: "member",
            role: "admin",
          })
        ).role,
      ).toBe("admin");

      await expect(
        store.updateMemberRole({
          workspaceId: team.id,
          actorUserId: "owner",
          targetUserId: "owner",
          role: "admin",
        }),
      ).rejects.toThrow(/owner/i);

      await expect(
        store.updateMemberRole({
          workspaceId: team.id,
          actorUserId: "admin",
          targetUserId: "owner",
          role: "member",
        }),
      ).rejects.toThrow(/owner/i);
    });

    it("transfers ownership to another member", async () => {
      const store = openStore();
      const team = await store.createWorkspace({
        name: "Team",
        kind: "team",
        ownerUserId: "owner",
      });
      await store.addMember(team.id, "member", "member");

      await store.transferOwnership({
        workspaceId: team.id,
        actorUserId: "owner",
        targetUserId: "member",
      });
      expect(await store.getMembership(team.id, "member")).toBe("owner");
      expect(await store.getMembership(team.id, "owner")).toBe("admin");

      await expect(
        store.transferOwnership({
          workspaceId: team.id,
          actorUserId: "owner",
          targetUserId: "member",
        }),
      ).rejects.toThrow(/only the workspace owner/i);

      const personal = await store.ensurePersonalWorkspace("solo");
      await expect(
        store.transferOwnership({
          workspaceId: personal.id,
          actorUserId: "solo",
          targetUserId: "someone",
        }),
      ).rejects.toThrow(/personal/i);
    });

    it("removes members and blocks last-owner leave", async () => {
      const store = openStore();
      const team = await store.createWorkspace({
        name: "Team",
        kind: "team",
        ownerUserId: "owner",
      });
      await store.addMember(team.id, "member", "member");
      await store.addMember(team.id, "admin", "admin");
      await store.addMember(team.id, "admin-2", "admin");

      await store.removeMember({
        workspaceId: team.id,
        actorUserId: "admin",
        targetUserId: "member",
      });
      expect(await store.getMembership(team.id, "member")).toBeNull();

      await expect(
        store.removeMember({
          workspaceId: team.id,
          actorUserId: "admin",
          targetUserId: "admin-2",
        }),
      ).rejects.toThrow(/cannot remove other admins/i);

      await store.removeMember({
        workspaceId: team.id,
        actorUserId: "admin",
        targetUserId: "admin",
      });
      expect(await store.getMembership(team.id, "admin")).toBeNull();

      await expect(
        store.removeMember({
          workspaceId: team.id,
          actorUserId: "owner",
          targetUserId: "owner",
        }),
      ).rejects.toThrow(/last workspace owner/i);

      const personal = await store.ensurePersonalWorkspace("solo");
      await expect(
        store.removeMember({
          workspaceId: personal.id,
          actorUserId: "solo",
          targetUserId: "solo",
        }),
      ).rejects.toThrow(/personal/i);
    });
  });
}
