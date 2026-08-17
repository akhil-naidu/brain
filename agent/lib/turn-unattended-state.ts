import { defineState } from "eve/context";
import type { ModelMessage } from "ai";
import { extractUnattendedFromMessages } from "@/agent/lib/client-context-model";

/** Durable per-session slot so approval can treat scheduled runs as unattended. */
export const turnUnattended = defineState("brain.turnUnattended", (): boolean => false);

export function syncTurnUnattended(messages: readonly ModelMessage[]): void {
  turnUnattended.update(() => extractUnattendedFromMessages(messages));
}
