import { describe, expect, it } from "vitest";
import {
  MAX_PLAYBOOKS,
  readStoredPlaybooks,
  removePlaybook,
  upsertPlaybook,
  writeStoredPlaybooks,
} from "@/lib/chat/playbooks";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe("playbooks store", () => {
  it("round-trips playbooks through storage", () => {
    const storage = memoryStorage();
    const created = upsertPlaybook([], {
      label: "  Triage inbox ",
      prompt: " Help me triage important email. ",
    });
    writeStoredPlaybooks(created.playbooks, storage);
    const loaded = readStoredPlaybooks(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.label).toBe("Triage inbox");
    expect(loaded[0]?.prompt).toBe("Help me triage important email.");
  });

  it("updates and deletes playbooks", () => {
    const first = upsertPlaybook([], { label: "One", prompt: "Prompt one" });
    const second = upsertPlaybook(first.playbooks, {
      id: first.playbook.id,
      label: "One updated",
      prompt: "Prompt one updated",
    });
    expect(second.playbooks).toHaveLength(1);
    expect(second.playbook.label).toBe("One updated");
    expect(removePlaybook(second.playbooks, first.playbook.id)).toEqual([]);
  });

  it("enforces the playbook limit", () => {
    let playbooks = upsertPlaybook([], { label: "P0", prompt: "Prompt 0" }).playbooks;
    for (let index = 1; index < MAX_PLAYBOOKS; index += 1) {
      playbooks = upsertPlaybook(playbooks, {
        label: `P${index}`,
        prompt: `Prompt ${index}`,
      }).playbooks;
    }
    expect(playbooks).toHaveLength(MAX_PLAYBOOKS);
    expect(() => upsertPlaybook(playbooks, { label: "Overflow", prompt: "Too many" })).toThrow(
      /up to/i,
    );
  });
});
