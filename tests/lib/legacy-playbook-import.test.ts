import { describe, expect, it } from "vitest";
import {
  decideLegacyPlaybookImport,
  playbooksMigratedStorageKey,
  type Playbook,
} from "@/lib/chat/playbooks";

const sample: Playbook = {
  id: "pb-1",
  label: "Triage",
  prompt: "Triage mail",
  updatedAt: 1,
};

describe("decideLegacyPlaybookImport", () => {
  it("keys migrated flags per user", () => {
    expect(playbooksMigratedStorageKey("user-a")).toBe("brain.playbooks.migrated.v1:user-a");
    expect(playbooksMigratedStorageKey("user-b")).not.toBe(playbooksMigratedStorageKey("user-a"));
  });

  it("imports for the claiming empty user", () => {
    expect(
      decideLegacyPlaybookImport({
        userId: "user-a",
        serverEmpty: true,
        legacy: [sample],
        migratedFlag: null,
        claimUserId: null,
      }),
    ).toEqual({ action: "import", playbooks: [sample] });
  });

  it("blocks another empty user after someone claimed the legacy bag", () => {
    expect(
      decideLegacyPlaybookImport({
        userId: "user-b",
        serverEmpty: true,
        legacy: [sample],
        migratedFlag: null,
        claimUserId: "user-a",
      }),
    ).toEqual({ action: "mark_done" });
  });

  it("skips when this user already migrated or server is not empty", () => {
    expect(
      decideLegacyPlaybookImport({
        userId: "user-a",
        serverEmpty: true,
        legacy: [sample],
        migratedFlag: "1",
        claimUserId: "user-a",
      }),
    ).toEqual({ action: "skip" });
    expect(
      decideLegacyPlaybookImport({
        userId: "user-a",
        serverEmpty: false,
        legacy: [sample],
        migratedFlag: null,
        claimUserId: null,
      }),
    ).toEqual({ action: "skip" });
  });
});
