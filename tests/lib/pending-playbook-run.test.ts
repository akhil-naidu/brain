import { afterEach, describe, expect, it } from "vitest";
import { stashPendingPlaybookRun, takePendingPlaybookRun } from "@/lib/chat/pending-playbook-run";

describe("pending playbook run", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("stashes and clears a prompt", () => {
    stashPendingPlaybookRun("  Triage inbox  ");
    expect(takePendingPlaybookRun()).toBe("Triage inbox");
    expect(takePendingPlaybookRun()).toBeNull();
  });

  it("ignores empty prompts", () => {
    stashPendingPlaybookRun("   ");
    expect(takePendingPlaybookRun()).toBeNull();
  });
});
