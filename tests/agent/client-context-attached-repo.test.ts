import { describe, expect, it } from "vitest";
import {
  extractAttachedRepoFromMessages,
  extractChatModeFromMessages,
} from "@/agent/lib/client-context-model";

describe("extractAttachedRepoFromMessages", () => {
  it("reads repo from the newest client context message", () => {
    const messages = [
      {
        role: "user" as const,
        content: `Client context:\n${JSON.stringify({ modelId: "deepseek/deepseek-v4-pro", mode: "agent", repo: "acme/api@main" })}`,
      },
    ];
    expect(extractAttachedRepoFromMessages(messages)).toEqual({
      owner: "acme",
      name: "api",
      ref: "main",
    });
    expect(extractChatModeFromMessages(messages)).toBe("agent");
  });

  it("returns null when repo is absent", () => {
    const messages = [
      {
        role: "user" as const,
        content: `Client context:\n${JSON.stringify({ modelId: "deepseek/deepseek-v4-pro", mode: "ask" })}`,
      },
    ];
    expect(extractAttachedRepoFromMessages(messages)).toBeNull();
  });
});
