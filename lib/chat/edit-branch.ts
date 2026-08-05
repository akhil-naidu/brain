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

/** Message ids and turn ids from the edited user bubble through the end of the thread. */
export function collectEditSuppression(
  messages: readonly EveMessage[],
  fromMessageId: string,
): {
  readonly messageIds: readonly string[];
  readonly turnIds: readonly string[];
} {
  const start = messages.findIndex((message) => message.id === fromMessageId);
  if (start < 0) {
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

export function applyMessageSuppression(
  messages: readonly EveMessage[],
  suppressedIds: ReadonlySet<string>,
): readonly EveMessage[] {
  if (suppressedIds.size === 0) {
    return messages;
  }
  return messages.filter((message) => !suppressedIds.has(message.id));
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
