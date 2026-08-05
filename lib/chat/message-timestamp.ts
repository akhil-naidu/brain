import type { HandleMessageStreamEvent } from "eve/client";
import { eventTurnId } from "@/lib/chat/edit-branch";

/** First event timestamp for a turn, when eve stamped `meta.at`. */
export function timestampForTurn(
  turnId: string | undefined,
  events: readonly HandleMessageStreamEvent[],
): string | null {
  if (!turnId) {
    return null;
  }

  for (const event of events) {
    if (eventTurnId(event) !== turnId) {
      continue;
    }
    const at = event.meta?.at;
    if (typeof at === "string" && at.length > 0) {
      return at;
    }
  }

  return null;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Friendly label like "Today, 8:27 PM" or "Yesterday, 8:27 PM". */
export function formatMessageTimestamp(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  const today = startOfLocalDay(now);
  const messageDay = startOfLocalDay(date);
  const dayMs = 24 * 60 * 60 * 1000;
  const deltaDays = Math.round((today.getTime() - messageDay.getTime()) / dayMs);

  if (deltaDays === 0) {
    return `Today, ${time}`;
  }
  if (deltaDays === 1) {
    return `Yesterday, ${time}`;
  }

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date);

  return `${dateLabel}, ${time}`;
}
