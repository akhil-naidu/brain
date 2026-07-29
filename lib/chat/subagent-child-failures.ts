"use client";

import { Client, type HandleMessageStreamEvent } from "eve/client";
import { useEffect, useMemo, useRef, useState } from "react";

export type SubagentChildFailure = {
  readonly message: string;
  readonly toolName: string;
};

type ActiveChild = {
  readonly abort: AbortController;
  readonly childSessionId: string;
  readonly name: string;
};

function failureMessageFromActionResult(
  event: Extract<HandleMessageStreamEvent, { type: "action.result" }>,
) {
  return (
    event.data.error?.message ??
    (typeof event.data.result.output === "string"
      ? event.data.result.output
      : event.data.result.output &&
          typeof event.data.result.output === "object" &&
          "message" in event.data.result.output &&
          typeof event.data.result.output.message === "string"
        ? event.data.result.output.message
        : "Tool failed")
  );
}

function toolNameFromActionResult(
  event: Extract<HandleMessageStreamEvent, { type: "action.result" }>,
) {
  const result = event.data.result;
  if ("toolName" in result && typeof result.toolName === "string") {
    return result.toolName;
  }
  if ("subagentName" in result && typeof result.subagentName === "string") {
    return result.subagentName;
  }
  return "tool";
}

function currentTurnStartIndex(events: readonly HandleMessageStreamEvent[]) {
  let startIndex = 0;
  for (let index = 0; index < events.length; index += 1) {
    if (events[index]?.type === "turn.started") {
      startIndex = index;
    }
  }
  return startIndex;
}

/**
 * Watches parent `subagent.called` events and attaches lightweight child
 * streams so mid-flight child tool failures can surface under the parent
 * subagent row without a full nested chat UI.
 */
export function useSubagentChildFailures(
  events: readonly HandleMessageStreamEvent[],
): ReadonlyMap<string, readonly SubagentChildFailure[]> {
  const [failuresByCallId, setFailuresByCallId] = useState<
    ReadonlyMap<string, readonly SubagentChildFailure[]>
  >(() => new Map());
  const activeChildrenRef = useRef(new Map<string, ActiveChild>());
  const seenCalledRef = useRef(new Set<string>());
  const clientRef = useRef<Client | null>(null);
  const currentTurnStartRef = useRef(0);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  // Re-run only when the stream grows or the latest event type changes — not on
  // unrelated parent re-renders that keep the same event list reference churn.
  const eventsSig = `${events.length}:${events.at(-1)?.type ?? ""}`;

  const getClient = () => {
    clientRef.current ??= new Client({ host: "" });
    return clientRef.current;
  };

  useEffect(() => {
    const activeChildren = activeChildrenRef.current;
    const currentEvents = eventsRef.current;
    const turnStartIndex = currentTurnStartIndex(currentEvents);

    if (turnStartIndex !== currentTurnStartRef.current) {
      currentTurnStartRef.current = turnStartIndex;
      for (const child of activeChildren.values()) {
        child.abort.abort();
      }
      activeChildren.clear();
      seenCalledRef.current.clear();
      setFailuresByCallId((previous) => (previous.size === 0 ? previous : new Map()));
    }

    const turnEvents = currentEvents.slice(turnStartIndex);

    for (const event of turnEvents) {
      if (event.type === "subagent.called") {
        const { callId, childSessionId, name } = event.data;
        if (seenCalledRef.current.has(callId) || activeChildren.has(callId)) {
          continue;
        }

        seenCalledRef.current.add(callId);
        const abort = new AbortController();
        activeChildren.set(callId, { abort, childSessionId, name });

        void (async () => {
          try {
            const childSession = getClient().session({
              sessionId: childSessionId,
              streamIndex: 0,
            });

            for await (const childEvent of childSession.stream({
              signal: abort.signal,
              startIndex: 0,
            })) {
              if (childEvent.type !== "action.result") {
                continue;
              }
              if (
                childEvent.data.status !== "failed" &&
                childEvent.data.status !== "rejected"
              ) {
                continue;
              }

              const failure: SubagentChildFailure = {
                message: failureMessageFromActionResult(childEvent),
                toolName: toolNameFromActionResult(childEvent),
              };

              setFailuresByCallId((previous) => {
                const existing = previous.get(callId) ?? [];
                if (
                  existing.some(
                    (item) =>
                      item.toolName === failure.toolName && item.message === failure.message,
                  )
                ) {
                  return previous;
                }
                const next = new Map(previous);
                next.set(callId, [...existing, failure]);
                return next;
              });
            }
          } catch {
            // Child streams end on abort/settle; ignore disconnect noise.
          } finally {
            activeChildren.get(callId)?.abort.abort();
            activeChildren.delete(callId);
          }
        })();
        continue;
      }

      if (event.type === "action.result") {
        const callId = event.data.result.callId;
        const child = activeChildren.get(callId);
        if (child) {
          child.abort.abort();
          activeChildren.delete(callId);
        }
        continue;
      }

      if (
        event.type === "turn.completed" ||
        event.type === "turn.failed" ||
        event.type === "turn.cancelled" ||
        event.type === "session.failed" ||
        event.type === "session.waiting"
      ) {
        for (const child of activeChildren.values()) {
          child.abort.abort();
        }
        activeChildren.clear();
      }
    }
  }, [eventsSig]);

  useEffect(() => {
    return () => {
      for (const child of activeChildrenRef.current.values()) {
        child.abort.abort();
      }
      activeChildrenRef.current.clear();
    };
  }, []);

  return useMemo(() => failuresByCallId, [failuresByCallId]);
}
