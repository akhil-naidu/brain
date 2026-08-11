import type { HandleMessageStreamEvent } from "eve/client";
import type { EveMessage } from "eve/react";

/** Turn id from message metadata, or from eve's `${turnId}:user|assistant` ids. */
export function turnIdFromMessage(message: EveMessage): string | undefined {
  if (message.metadata?.turnId) {
    return message.metadata.turnId;
  }

  if (message.id.startsWith("optimistic:")) {
    return undefined;
  }

  const match = /^(.*):(user|assistant)$/.exec(message.id);
  return match?.[1];
}

export function eventTurnId(event: HandleMessageStreamEvent): string | undefined {
  if (!("data" in event)) {
    return undefined;
  }

  const data: unknown = event.data;
  if (!data || typeof data !== "object" || !("turnId" in data)) {
    return undefined;
  }

  const turnId = Reflect.get(data, "turnId");
  return typeof turnId === "string" ? turnId : undefined;
}

function collectSuppressionFromIndex(
  messages: readonly EveMessage[],
  start: number,
): {
  readonly messageIds: readonly string[];
  readonly turnIds: readonly string[];
} {
  if (start < 0 || start >= messages.length) {
    return { messageIds: [], turnIds: [] };
  }

  const slice = messages.slice(start);
  const turnIds: string[] = [];
  for (const message of slice) {
    const turnId = turnIdFromMessage(message);
    if (turnId && !turnIds.includes(turnId)) {
      turnIds.push(turnId);
    }
  }

  return {
    messageIds: slice.map((message) => message.id),
    turnIds,
  };
}

/** Message ids and turn ids from the edited user bubble through the end of the thread. */
export function collectEditSuppression(
  messages: readonly EveMessage[],
  fromMessageId: string,
): {
  readonly messageIds: readonly string[];
  readonly turnIds: readonly string[];
} {
  return collectSuppressionFromIndex(
    messages,
    messages.findIndex((message) => message.id === fromMessageId),
  );
}

/**
 * Message ids and turn ids after the user prompt — regenerate keeps the prompt visible
 * and only replaces the assistant reply (and anything after it).
 */
export function collectRegenerateSuppression(
  messages: readonly EveMessage[],
  userMessageId: string,
): {
  readonly messageIds: readonly string[];
  readonly turnIds: readonly string[];
} {
  const userIndex = messages.findIndex((message) => message.id === userMessageId);
  if (userIndex < 0) {
    return { messageIds: [], turnIds: [] };
  }
  return collectSuppressionFromIndex(messages, userIndex + 1);
}

export function applyMessageSuppression(
  messages: readonly EveMessage[],
  suppressedIds: ReadonlySet<string>,
): readonly EveMessage[] {
  if (suppressedIds.size === 0) {
    return messages;
  }
  return messages.filter((message) => !suppressedIds.has(message.id));
}

/**
 * While a regenerate resend is in flight, hide duplicate user bubbles that follow the
 * original prompt so the thread does not briefly show the same ask twice.
 */
export function applyRegenerateAnchorFilter(
  messages: readonly EveMessage[],
  regenerateAnchorUserId: string | null,
): readonly EveMessage[] {
  if (!regenerateAnchorUserId) {
    return messages;
  }

  const anchorIndex = messages.findIndex((message) => message.id === regenerateAnchorUserId);
  if (anchorIndex < 0) {
    return messages;
  }

  return messages.filter((message, index) => {
    if (index <= anchorIndex) {
      return true;
    }
    return message.role !== "user";
  });
}

/** Drop stream events that belong to replaced turns so reloads match the edited UI. */
export function omitTurnEvents(
  events: readonly HandleMessageStreamEvent[],
  droppedTurnIds: ReadonlySet<string>,
): readonly HandleMessageStreamEvent[] {
  if (droppedTurnIds.size === 0) {
    return events;
  }
  return events.filter((event) => {
    const turnId = eventTurnId(event);
    return turnId === undefined || !droppedTurnIds.has(turnId);
  });
}

/** True when the event list still has a persisted user message after omissions. */
export function hasPersistedUserMessage(events: readonly HandleMessageStreamEvent[]): boolean {
  return events.some((event) => event.type === "message.received");
}

/**
 * Whether omitting these turn ids would still leave a user message in history.
 * Used so a failed regenerate cannot persist an empty chat.
 */
export function canOmitTurnsWithoutEmptyingHistory(
  events: readonly HandleMessageStreamEvent[],
  turnIdsToOmit: ReadonlySet<string>,
): boolean {
  if (turnIdsToOmit.size === 0) {
    return true;
  }
  return hasPersistedUserMessage(omitTurnEvents(events, turnIdsToOmit));
}
