import type { EveDynamicToolPart } from "eve/react";

import type { SubagentChildFailure } from "@/lib/chat/subagent-child-failures";

export type ToolStatus = "completed" | "denied" | "error" | "incomplete" | "running";
type ToolState = EveDynamicToolPart["state"];

function assertNever(value: never): never {
  throw new Error(`Unsupported tool state: ${String(value)}`);
}

export function getToolGroupKey(parts: readonly Pick<EveDynamicToolPart, "toolCallId">[]): string {
  const firstPart = parts.at(0);
  return firstPart ? `tools:${firstPart.toolCallId}` : "tools:empty";
}

export function needsInputResponse(part: EveDynamicToolPart): boolean {
  return Boolean(part.toolMetadata?.eve?.inputRequest && !part.toolMetadata.eve.inputResponse);
}

export function getToolStatusFromState(state: ToolState, hasFailures: boolean): ToolStatus {
  switch (state) {
    case "input-streaming":
    case "input-available":
    case "approval-requested":
    case "approval-responded":
      return hasFailures ? "error" : "running";
    case "output-available":
      return hasFailures ? "error" : "completed";
    case "output-denied":
      return "denied";
    case "output-error":
      return "error";
    default:
      return assertNever(state);
  }
}

export function getToolStatus(
  part: EveDynamicToolPart,
  childFailures?: readonly SubagentChildFailure[],
): ToolStatus {
  return getToolStatusFromState(part.state, Boolean(childFailures?.length));
}

export function getSettledToolStatus(status: ToolStatus, isSettled: boolean): ToolStatus {
  return isSettled && status === "running" ? "incomplete" : status;
}

export function getToolGroupStatus(
  parts: readonly EveDynamicToolPart[],
  childFailuresByCallId?: ReadonlyMap<string, readonly SubagentChildFailure[]>,
): ToolStatus {
  const statuses = new Set(
    parts.map((part) => getToolStatus(part, childFailuresByCallId?.get(part.toolCallId))),
  );

  if (statuses.has("error")) {
    return "error";
  }
  if (statuses.has("denied")) {
    return "denied";
  }
  if (statuses.has("incomplete")) {
    return "incomplete";
  }
  if (statuses.has("running")) {
    return "running";
  }
  return "completed";
}

export function toolStatusLabel(status: ToolStatus): string {
  switch (status) {
    case "completed":
      return "Complete";
    case "denied":
      return "Denied";
    case "error":
      return "Error";
    case "incomplete":
      return "Incomplete";
    case "running":
      return "Running";
    default:
      return assertNever(status);
  }
}

function hasPayload(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }
  return true;
}

export function hasToolDetails(
  part: EveDynamicToolPart,
  childFailures?: readonly SubagentChildFailure[],
): boolean {
  if (part.state === "output-error" || part.state === "output-denied") {
    return true;
  }
  if (childFailures?.length) {
    return true;
  }
  if (part.toolMetadata?.eve?.inputRequest) {
    return true;
  }

  return hasPayload(part.input) || (part.state === "output-available" && hasPayload(part.output));
}
