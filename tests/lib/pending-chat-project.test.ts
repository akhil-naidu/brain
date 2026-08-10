import { afterEach, describe, expect, it } from "vitest";
import {
  stashPendingChatProjectId,
  takePendingChatProjectId,
} from "@/lib/chat/pending-chat-project";

describe("pending chat project", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("stashes and clears a project id", () => {
    stashPendingChatProjectId("  proj-1  ");
    expect(takePendingChatProjectId()).toBe("proj-1");
    expect(takePendingChatProjectId()).toBeNull();
  });

  it("clears a pending project id", () => {
    stashPendingChatProjectId("proj-1");
    stashPendingChatProjectId(null);
    expect(takePendingChatProjectId()).toBeNull();
  });
});
