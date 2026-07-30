import type { EnabledConnections } from "@/app/_components/chat-shell-context";

/**
 * Builds the per-turn client context describing which connections the user has
 * enabled. This only steers the model; it is not an authorization boundary.
 */
export function createConnectionClientContext(enabledConnections: EnabledConnections): string {
  const enabled: string[] = [];
  const disabled: string[] = [];

  for (const [name, isEnabled] of Object.entries(enabledConnections)) {
    if (isEnabled) {
      enabled.push(name);
    } else {
      disabled.push(name);
    }
  }

  if (enabled.length === 0) {
    return "The user has disabled all external connections for this turn. Do not search or call connection tools unless the user enables a connection first.";
  }

  const disabledContext =
    disabled.length > 0
      ? ` Do not use disabled connections unless the user enables them first: ${disabled.join(", ")}.`
      : "";

  return `The user has enabled these external connections for this turn: ${enabled.join(", ")}. Use an enabled connection when it is relevant to the user's request.${disabledContext}`;
}
