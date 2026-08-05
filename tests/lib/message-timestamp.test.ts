import { describe, expect, it } from "vitest";
import type { HandleMessageStreamEvent } from "eve/client";
import { formatMessageTimestamp, timestampForTurn } from "@/lib/chat/message-timestamp";

describe("timestampForTurn", () => {
  it("returns the first meta.at for the turn", () => {
    const events = [
      {
        type: "turn.started",
        data: { turnId: "t1", sequence: 1 },
        meta: { at: "2026-08-04T20:27:00.000Z" },
      },
      {
        type: "message.received",
        data: { turnId: "t1", message: "hi", sequence: 2 },
        meta: { at: "2026-08-04T20:27:01.000Z" },
      },
    ] as HandleMessageStreamEvent[];

    expect(timestampForTurn("t1", events)).toBe("2026-08-04T20:27:00.000Z");
    expect(timestampForTurn("missing", events)).toBeNull();
    expect(timestampForTurn(undefined, events)).toBeNull();
  });
});

describe("formatMessageTimestamp", () => {
  const now = new Date("2026-08-05T12:00:00.000Z");

  it("labels today and yesterday", () => {
    expect(formatMessageTimestamp("2026-08-05T14:57:00.000Z", now)).toMatch(/^Today,/);
    expect(formatMessageTimestamp("2026-08-04T14:57:00.000Z", now)).toMatch(/^Yesterday,/);
  });

  it("falls back to a short date for older messages", () => {
    expect(formatMessageTimestamp("2026-07-01T14:57:00.000Z", now)).toMatch(/Jul/);
  });
});
