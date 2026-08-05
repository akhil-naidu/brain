import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_CHATS_DB_PATH, resolveChatsDbPath } from "@/lib/chat/store/path";

describe("resolveChatsDbPath", () => {
  it("defaults under .eve", () => {
    expect(resolveChatsDbPath({}, "/tmp/brain")).toBe(
      path.resolve("/tmp/brain", DEFAULT_CHATS_DB_PATH),
    );
  });

  it("honors absolute and relative BRAIN_CHATS_DB_PATH", () => {
    expect(resolveChatsDbPath({ BRAIN_CHATS_DB_PATH: "/var/chats.db" }, "/tmp/brain")).toBe(
      "/var/chats.db",
    );
    expect(resolveChatsDbPath({ BRAIN_CHATS_DB_PATH: "data/chats.db" }, "/tmp/brain")).toBe(
      path.resolve("/tmp/brain", "data/chats.db"),
    );
  });
});
