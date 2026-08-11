import { describe, expect, it } from "vitest";
import {
  attachedRepoCloneUrl,
  attachedRepoStorageKey,
  formatAttachedRepo,
  parseAttachedRepo,
} from "@/lib/chat/attached-repo";

describe("parseAttachedRepo", () => {
  it("parses owner/repo", () => {
    expect(parseAttachedRepo("acme/api")).toEqual({ owner: "acme", name: "api" });
  });

  it("parses owner/repo@ref", () => {
    expect(parseAttachedRepo("acme/api@feature/x")).toEqual({
      owner: "acme",
      name: "api",
      ref: "feature/x",
    });
  });

  it("parses github URLs with optional tree ref", () => {
    expect(parseAttachedRepo("https://github.com/acme/api.git")).toEqual({
      owner: "acme",
      name: "api",
    });
    expect(parseAttachedRepo("github.com/acme/api/tree/main")).toEqual({
      owner: "acme",
      name: "api",
      ref: "main",
    });
  });

  it("rejects non-github and empty input", () => {
    expect(parseAttachedRepo("")).toBeNull();
    expect(parseAttachedRepo("not-a-repo")).toBeNull();
    expect(parseAttachedRepo("https://gitlab.com/acme/api")).toBeNull();
  });
});

describe("attached repo helpers", () => {
  it("formats and builds clone URL", () => {
    expect(formatAttachedRepo({ owner: "acme", name: "api" })).toBe("acme/api");
    expect(formatAttachedRepo({ owner: "acme", name: "api", ref: "main" })).toBe("acme/api@main");
    expect(attachedRepoCloneUrl({ owner: "acme", name: "api" })).toBe(
      "https://github.com/acme/api.git",
    );
  });

  it("keys storage by chat id", () => {
    expect(attachedRepoStorageKey(null)).toBe("brain.attachedRepo.ephemeral");
    expect(attachedRepoStorageKey("chat-1")).toBe("brain.attachedRepo.chat-1");
  });
});
