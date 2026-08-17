import type { AgentSafetyPosture } from "@/lib/auth/workspaces/types";
import { evaluateCommandPolicy } from "@/agent/lib/command-policy";

export type ToolAuthorizationDecision =
  "not-applicable" | "user-approval" | { readonly type: "denied"; readonly reason: string };

export type ToolAuthorizationKind = "connection" | "bash" | "write_file";

export type DecideToolAuthorizationInput = {
  readonly mode: string;
  readonly posture: AgentSafetyPosture;
  readonly unattended: boolean;
  readonly toolKind: ToolAuthorizationKind;
  readonly toolName: string;
  readonly isSafeRead: boolean;
  readonly args?: unknown;
};

function denied(reason: string): ToolAuthorizationDecision {
  return { type: "denied", reason };
}

function isPlanMode(mode: string): boolean {
  return mode === "plan";
}

function isAskMode(mode: string): boolean {
  return mode === "ask";
}

function isMutatingHarness(kind: ToolAuthorizationKind): boolean {
  return kind === "bash" || kind === "write_file";
}

function autoHitl(input: DecideToolAuthorizationInput): ToolAuthorizationDecision {
  if (input.toolKind === "connection") {
    return input.isSafeRead ? "not-applicable" : "user-approval";
  }
  return "not-applicable";
}

function postureHitl(
  posture: AgentSafetyPosture,
  input: DecideToolAuthorizationInput,
): ToolAuthorizationDecision {
  if (posture === "strict") {
    if (input.toolKind === "connection" || isMutatingHarness(input.toolKind)) {
      return "user-approval";
    }
    return "not-applicable";
  }
  if (posture === "dangerous") {
    return "not-applicable";
  }
  return autoHitl(input);
}

/**
 * Ask → Plan mutating → command policy → posture HITL.
 * Unattended runs keep Auto HITL after command policy.
 */
export function decideToolAuthorization(
  input: DecideToolAuthorizationInput,
): ToolAuthorizationDecision {
  if (isAskMode(input.mode)) {
    return denied("Ask mode blocks connection tools. Switch to Agent mode.");
  }

  if (isPlanMode(input.mode)) {
    if (
      isMutatingHarness(input.toolKind) ||
      (input.toolKind === "connection" && !input.isSafeRead)
    ) {
      return denied("Plan mode blocks mutating tools. Switch to Agent to implement.");
    }
  }

  if (evaluateCommandPolicy({ toolName: input.toolName, args: input.args }) === "deny") {
    return denied("Blocked by host command policy.");
  }

  const posture = input.unattended ? "auto" : input.posture;
  return postureHitl(posture, input);
}
