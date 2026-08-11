import type { HandleMessageStreamEvent } from "eve/client";
import type { EveMessage } from "eve/react";

import { eventTurnId, turnIdFromMessage } from "@/lib/chat/edit-branch";

/** Settled assistant row with no visible work. */
export type AssistantEmptyOutcome = "failed" | "stopped";

export function hasVisibleAssistantContent(message: EveMessage): boolean {
  if (message.role !== "assistant") {
    return false;
  }

  return message.parts.some(
    (part) =>
      (part.type === "text" && part.text.trim().length > 0) ||
      part.type === "dynamic-tool" ||
      part.type === "authorization" ||
      (part.type === "reasoning" && part.text.trim().length > 0) ||
      part.type === "file",
  );
}

function terminalOutcomeForTurn(
  events: readonly HandleMessageStreamEvent[],
  turnId: string,
): "cancelled" | "completed" | "failed" | null {
  let terminal: "cancelled" | "completed" | "failed" | null = null;

  for (const event of events) {
    if (eventTurnId(event) !== turnId) {
      continue;
    }
    if (event.type === "turn.cancelled") {
      terminal = "cancelled";
    } else if (event.type === "turn.failed") {
      terminal = "failed";
    } else if (event.type === "turn.completed") {
      terminal = "completed";
    }
  }

  return terminal;
}

/**
 * Placeholder for an assistant message that settled with nothing visible.
 * Prefer `turn.cancelled` / `turn.failed` from events so reloads stay accurate.
 */
export function resolveAssistantEmptyOutcome(input: {
  readonly agentStatus: string;
  readonly events: readonly HandleMessageStreamEvent[];
  readonly isLatestAssistant: boolean;
  readonly isStreaming: boolean;
  readonly message: EveMessage;
}): AssistantEmptyOutcome | null {
  if (input.isStreaming || input.message.role !== "assistant") {
    return null;
  }
  if (hasVisibleAssistantContent(input.message)) {
    return null;
  }

  const turnId = turnIdFromMessage(input.message);
  const terminal = turnId ? terminalOutcomeForTurn(input.events, turnId) : null;

  if (terminal === "cancelled") {
    return "stopped";
  }
  if (terminal === "failed" || terminal === "completed") {
    return "failed";
  }

  if (!input.isLatestAssistant) {
    return null;
  }

  if (input.agentStatus === "error") {
    return "failed";
  }

  // No turn id on the message — use the latest terminal turn event as a hint.
  const latestTerminal = latestTerminalTurnOutcome(input.events);
  if (latestTerminal === "cancelled") {
    return "stopped";
  }
  if (latestTerminal === "failed") {
    return "failed";
  }

  // Settled latest empty row with no terminal event yet (e.g. aborted before turn id).
  if (input.agentStatus !== "submitted" && input.agentStatus !== "streaming") {
    return "failed";
  }

  return null;
}

function latestTerminalTurnOutcome(
  events: readonly HandleMessageStreamEvent[],
): "cancelled" | "completed" | "failed" | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!event) {
      continue;
    }
    if (event.type === "turn.cancelled") {
      return "cancelled";
    }
    if (event.type === "turn.failed") {
      return "failed";
    }
    if (event.type === "turn.completed") {
      return "completed";
    }
  }
  return null;
}

export function assistantEmptyOutcomeLabel(outcome: AssistantEmptyOutcome): string {
  return outcome === "stopped" ? "Response stopped" : "Couldn't generate a response";
}
