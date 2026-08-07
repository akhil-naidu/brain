import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ChatConcurrencyError } from "@/lib/chat/store/concurrency";
import { createPostgresChatStore } from "@/lib/chat/store/postgres-chat-store";
import { parseStreamEvent } from "@/lib/chat/store/parse";
import { ensureAuthReady } from "@/lib/auth/server";
import { getPool, resetPoolForTests } from "@/lib/db/pool";
import type { HandleMessageStreamEvent } from "eve/client";

const DATABASE_URL = process.env["BRAIN_DATABASE_URL"] ?? process.env["DATABASE_URL"];

function openStore() {
  return createPostgresChatStore();
}

function fakeEvent(message: string): HandleMessageStreamEvent {
  return parseStreamEvent({
    type: "message.delta",
    data: { message },
  });
}

if (!DATABASE_URL) {
  describe.skip("postgres chat store (BRAIN_DATABASE_URL not set)", () => {
    it.skip("skipped", () => {});
  });
} else {
  describe("postgres chat store", () => {
    beforeAll(async () => {
      process.env["BETTER_AUTH_SECRET"] =
        process.env["BETTER_AUTH_SECRET"] ?? "test-only-better-auth-secret-32chars!!";
      await ensureAuthReady();
    });

    beforeEach(async () => {
      const pool = getPool();
      await pool.query("DELETE FROM chat_event");
      await pool.query("DELETE FROM chat");
    });

    afterAll(async () => {
      await resetPoolForTests();
    });

    it("creates, lists, updates, and deletes chats for a user in a workspace", async () => {
      const store = openStore();
      const userId = "user-a";
      const workspaceId = "ws-a";
      const created = await store.createChat(userId, { title: "Hello world", workspaceId });

      expect(created.title).toBe("Hello world");
      expect(created.userId).toBe(userId);
      expect(created.workspaceId).toBe(workspaceId);
      expect(await store.listChats(userId, workspaceId)).toHaveLength(1);

      const updated = await store.updateChat(userId, workspaceId, created.id, {
        eveSession: { streamIndex: 3, sessionId: "s1", continuationToken: "c1" },
        appendEvents: [fakeEvent("one"), fakeEvent("two")],
      });

      expect(updated?.eveSession?.streamIndex).toBe(3);
      expect(updated?.events).toHaveLength(2);

      const snapshotted = await store.updateChat(userId, workspaceId, created.id, {
        events: [fakeEvent("only")],
        eveSession: { streamIndex: 4 },
      });
      expect(snapshotted?.events).toHaveLength(1);
      expect(snapshotted?.eveSession?.streamIndex).toBe(4);

      expect(await store.deleteChat(userId, workspaceId, created.id)).toBe(true);
      expect(await store.getChat(userId, workspaceId, created.id)).toBeNull();
      expect(await store.listChats(userId, workspaceId)).toHaveLength(0);
    });

    it("orders chats by most recently updated", async () => {
      const store = openStore();
      const userId = "user-a";
      const workspaceId = "ws-a";
      const first = await store.createChat(userId, { title: "First", workspaceId });
      const second = await store.createChat(userId, { title: "Second", workspaceId });

      await store.updateChat(userId, workspaceId, first.id, { title: "First updated" });

      const listed = await store.listChats(userId, workspaceId);
      expect(listed.map((chat) => chat.id)).toEqual([first.id, second.id]);
    });

    it("isolates chats between users and workspaces", async () => {
      const store = openStore();
      const a = await store.createChat("user-a", { title: "A only", workspaceId: "ws-1" });
      await store.createChat("user-b", { title: "B only", workspaceId: "ws-1" });
      await store.createChat("user-a", { title: "A ws2", workspaceId: "ws-2" });

      expect(await store.listChats("user-a", "ws-1")).toHaveLength(1);
      expect(await store.listChats("user-a", "ws-2")).toHaveLength(1);
      expect(await store.listChats("user-b", "ws-1")).toHaveLength(1);
      expect(await store.getChat("user-b", "ws-1", a.id)).toBeNull();
      expect(await store.deleteChat("user-b", "ws-1", a.id)).toBe(false);
      expect((await store.getChat("user-a", "ws-1", a.id))?.title).toBe("A only");
    });

    it("shares workspace chats with other members while keeping personal private", async () => {
      const store = openStore();
      const personal = await store.createChat("user-a", {
        title: "Private",
        workspaceId: "ws-1",
        visibility: "personal",
      });
      const shared = await store.createChat("user-a", {
        title: "Team thread",
        workspaceId: "ws-1",
        visibility: "shared",
      });

      expect((await store.listChats("user-b", "ws-1")).map((chat) => chat.id)).toEqual([shared.id]);
      expect(await store.getChat("user-b", "ws-1", personal.id)).toBeNull();
      expect((await store.getChat("user-b", "ws-1", shared.id))?.title).toBe("Team thread");

      const updated = await store.updateChat("user-b", "ws-1", shared.id, {
        title: "Team thread updated",
        expectedRevision: shared.revision,
      });
      expect(updated?.title).toBe("Team thread updated");
      expect(updated?.revision).toBe(shared.revision + 1);

      expect(await store.deleteChat("user-b", "ws-1", shared.id)).toBe(false);
      expect(await store.deleteChat("user-b", "ws-1", shared.id, { moderateShared: true })).toBe(
        true,
      );
      expect(await store.getChat("user-a", "ws-1", shared.id)).toBeNull();
      expect((await store.getChat("user-a", "ws-1", personal.id))?.visibility).toBe("personal");
    });

    it("lets the owner promote a personal chat to shared", async () => {
      const store = openStore();
      const personal = await store.createChat("user-a", {
        title: "Later share",
        workspaceId: "ws-1",
        visibility: "personal",
      });

      expect(
        await store.updateChat("user-b", "ws-1", personal.id, { visibility: "shared" }),
      ).toBeNull();
      expect(await store.getChat("user-b", "ws-1", personal.id)).toBeNull();

      const shared = await store.updateChat("user-a", "ws-1", personal.id, {
        visibility: "shared",
      });
      expect(shared?.visibility).toBe("shared");
      expect((await store.getChat("user-b", "ws-1", personal.id))?.title).toBe("Later share");
      expect(
        await store.updateChat("user-a", "ws-1", personal.id, { visibility: "personal" }),
      ).toBeNull();
    });

    it("reassigns legacy ownership and assigns workspace", async () => {
      const store = openStore();
      const legacy = await store.createChat("__legacy__", {
        title: "Old",
        workspaceId: "__unset__",
      });
      expect(await store.reassignOwner("__legacy__", "user-a")).toBe(1);
      expect(await store.assignWorkspaceToUserChats("user-a", "ws-personal")).toBe(1);
      expect((await store.getChat("user-a", "ws-personal", legacy.id))?.title).toBe("Old");
      expect(await store.listChats("__legacy__", "__unset__")).toHaveLength(0);
    });

    it("rejects stale shared chat updates with a conflict", async () => {
      const store = openStore();
      const shared = await store.createChat("user-a", {
        title: "Shared",
        workspaceId: "ws-1",
        visibility: "shared",
      });

      await store.updateChat("user-a", "ws-1", shared.id, {
        title: "Updated by A",
        expectedRevision: shared.revision,
      });

      await expect(
        store.updateChat("user-b", "ws-1", shared.id, {
          title: "Stale by B",
          expectedRevision: shared.revision,
        }),
      ).rejects.toThrow(ChatConcurrencyError);

      expect((await store.getChat("user-a", "ws-1", shared.id))?.title).toBe("Updated by A");
    });

    it("serializes shared chat turns with a lock", async () => {
      const store = openStore();
      const shared = await store.createChat("user-a", {
        title: "Shared",
        workspaceId: "ws-1",
        visibility: "shared",
      });

      await store.updateChat("user-a", "ws-1", shared.id, { turnLock: "acquire" });

      await expect(
        store.updateChat("user-b", "ws-1", shared.id, { turnLock: "acquire" }),
      ).rejects.toThrow(ChatConcurrencyError);

      await expect(
        store.updateChat("user-a", "ws-1", shared.id, {
          appendEvents: [fakeEvent("during turn")],
          expectedRevision: shared.revision,
        }),
      ).resolves.not.toThrow();

      const afterAppend = await store.getChat("user-a", "ws-1", shared.id);
      expect(afterAppend?.events).toHaveLength(1);
      expect(afterAppend?.revision).toBe(shared.revision + 1);

      await store.updateChat("user-a", "ws-1", afterAppend!.id, { turnLock: "release" });
      await store.updateChat("user-b", "ws-1", shared.id, { turnLock: "acquire" });
    });
  });
}
