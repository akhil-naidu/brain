import { describe, expect, it } from "vitest";
import type { HandleMessageStreamEvent } from "eve/client";
import type { EveMessage } from "eve/react";
import {
  applyMessageSuppression,
  collectEditSuppression,
  omitTurnEvents,
  turnIdFromMessage,
} from "@/lib/chat/edit-branch";

function userMessage(id: string, turnId?: string): EveMessage {
  return {
    id,
    role: "user",
    parts: [{ type: "text", text: "hi", state: "done" }],
    metadata: turnId ? { status: "complete", turnId } : { status: "complete" },
  };
}

function assistantMessage(id: string, turnId: string): EveMessage {
  return {
    id,
    role: "assistant",
    parts: [{ type: "text", text: "yo", state: "done" }],
    metadata: { status: "complete", turnId },
  };
}

describe("edit-branch helpers", () => {
  it("reads turn ids from metadata and message ids", () => {
    expect(turnIdFromMessage(userMessage("t1:user", "t1"))).toBe("t1");
    expect(turnIdFromMessage(userMessage("t2:user"))).toBe("t2");
    expect(turnIdFromMessage(userMessage("optimistic:abc:user"))).toBeUndefined();
  });

  it("collects messages and turns from the edited bubble onward", () => {
    const messages = [
      userMessage("t1:user", "t1"),
      assistantMessage("t1:assistant", "t1"),
      userMessage("t2:user", "t2"),
      assistantMessage("t2:assistant", "t2"),
    ];

    expect(collectEditSuppression(messages, "t2:user")).toEqual({
      messageIds: ["t2:user", "t2:assistant"],
      turnIds: ["t2"],
    });
  });

  it("hides suppressed messages in the thread", () => {
    const messages = [
      userMessage("t1:user", "t1"),
      assistantMessage("t1:assistant", "t1"),
      userMessage("t2:user", "t2"),
      userMessage("t3:user", "t3"),
    ];
    const visible = applyMessageSuppression(messages, new Set(["t2:user"]));
    expect(visible.map((message) => message.id)).toEqual(["t1:user", "t1:assistant", "t3:user"]);
  });

  it("omits stream events for dropped turns", () => {
    const events: HandleMessageStreamEvent[] = [
      { type: "turn.started", data: { turnId: "t1", sequence: 1 } },
      { type: "message.received", data: { turnId: "t1", message: "a", sequence: 2 } },
      { type: "turn.started", data: { turnId: "t2", sequence: 3 } },
      { type: "message.received", data: { turnId: "t2", message: "b", sequence: 4 } },
      { type: "session.completed" },
    ];

    const kept = omitTurnEvents(events, new Set(["t2"]));
    expect(kept).toHaveLength(3);
    expect(kept.map((event) => event.type)).toEqual([
      "turn.started",
      "message.received",
      "session.completed",
    ]);
  });
});
