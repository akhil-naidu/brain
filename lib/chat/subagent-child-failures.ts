"use client";

import { Client, type HandleMessageStreamEvent } from "eve/client";
import { useEffect, useRef, useState } from "react";

export type SubagentChildFailure = {
  readonly message: string;
  readonly toolName: string;
};

type FailureMap = ReadonlyMap<string, readonly SubagentChildFailure[]>;

type ActiveChild = {
  readonly abort: AbortController;
  readonly childSessionId: string;
  readonly name: string;
};

type ActionResultEvent = Extract<HandleMessageStreamEvent, { type: "action.result" }>;

const EMPTY_FAILURES: FailureMap = new Map();

function failureMessageFromActionResult(event: ActionResultEvent) {
  const { error, result } = event.data;

  if (error?.message) {
    return error.message;
  }

  if (typeof result.output === "string") {
    return result.output;
  }

  if (
    result.output &&
    typeof result.output === "object" &&
    "message" in result.output &&
    typeof result.output.message === "string"
  ) {
    return result.output.message;
  }

  return "Tool failed";
}

function toolNameFromActionResult(event: ActionResultEvent) {
  const result = event.data.result;

  if ("toolName" in result && typeof result.toolName === "string") {
    return result.toolName;
  }

  if ("subagentName" in result && typeof result.subagentName === "string") {
    return result.subagentName;
  }

  return "tool";
}

function isAbortError(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

function withFailure(
  failures: FailureMap,
  callId: string,
  failure: SubagentChildFailure,
): FailureMap {
  const existing = failures.get(callId) ?? [];

  const isDuplicate = existing.some(
    (item) => item.toolName === failure.toolName && item.message === failure.message,
  );

  if (isDuplicate) {
    return failures;
  }

  const next = new Map(failures);
  next.set(callId, [...existing, failure]);

  return next;
}

/**
 * Watches parent `subagent.called` events and attaches lightweight child
 * streams so mid-flight child tool failures can surface under the parent
 * subagent row without a full nested chat UI.
 *
 * Events are consumed through a cursor rather than by rescanning the current
 * turn on every render, so cost stays linear in the length of a long session.
 */
export function useSubagentChildFailures(events: readonly HandleMessageStreamEvent[]): FailureMap {
  const [failuresByCallId, setFailuresByCallId] = useState<FailureMap>(EMPTY_FAILURES);
  const activeChildrenRef = useRef(new Map<string, ActiveChild>());
  const seenCalledRef = useRef(new Set<string>());
  const clientRef = useRef<Client | null>(null);
  const processedCountRef = useRef(0);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const eventCount = events.length;

  useEffect(() => {
    const activeChildren = activeChildrenRef.current;
    const currentEvents = eventsRef.current;

    const getClient = () => {
      clientRef.current ??= new Client({ host: "" });
      return clientRef.current;
    };

    const abortAllChildren = () => {
      for (const child of activeChildren.values()) {
        child.abort.abort();
      }
      activeChildren.clear();
    };

    const startNewTurn = () => {
      abortAllChildren();
      seenCalledRef.current.clear();
      setFailuresByCallId((previous) => (previous.size === 0 ? previous : EMPTY_FAILURES));
    };

    // The stream was replaced (new session or remount) — reprocess from scratch.
    if (currentEvents.length < processedCountRef.current) {
      startNewTurn();
      processedCountRef.current = 0;
    }

    for (let index = processedCountRef.current; index < currentEvents.length; index += 1) {
      const event = currentEvents[index];

      if (!event) {
        continue;
      }

      if (event.type === "turn.started") {
        startNewTurn();
        continue;
      }

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

              if (childEvent.data.status !== "failed" && childEvent.data.status !== "rejected") {
                continue;
              }

              const failure: SubagentChildFailure = {
                message: failureMessageFromActionResult(childEvent),
                toolName: toolNameFromActionResult(childEvent),
              };

              setFailuresByCallId((previous) => withFailure(previous, callId, failure));
            }
          } catch (error) {
            // Aborts are the normal way these streams end once the child settles.
            // Anything else is a real transport failure worth showing.
            if (!isAbortError(error)) {
              setFailuresByCallId((previous) =>
                withFailure(previous, callId, {
                  message: "Lost connection to this subagent's activity stream.",
                  toolName: name,
                }),
              );
            }
          } finally {
            activeChildren.get(callId)?.abort.abort();
            activeChildren.delete(callId);
          }
        })();

        continue;
      }

      if (event.type === "action.result") {
        const child = activeChildren.get(event.data.result.callId);

        if (child) {
          child.abort.abort();
          activeChildren.delete(event.data.result.callId);
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
        abortAllChildren();
      }
    }

    processedCountRef.current = currentEvents.length;
  }, [eventCount]);

  useEffect(() => {
    const activeChildren = activeChildrenRef.current;

    return () => {
      for (const child of activeChildren.values()) {
        child.abort.abort();
      }
      activeChildren.clear();
    };
  }, []);

  return failuresByCallId;
}
