import type { AgentSafetyPosture } from "@/lib/auth/workspaces/types";

export type ToolResultScreening = "pass" | "deny";

export const TOOL_RESULT_SCREENING_STUB =
  "Tool ran, but the output was blocked by Auto screening (possible prompt injection or secret).";

const SCAN_BYTES = 256 * 1024;

const IGNORE_INSTRUCTIONS = /\bignore\s+(all\s+)?(previous|prior)\s+instructions\b/i;
const NEW_SYSTEM_PROMPT = /\bnew\s+system\s+prompt\b/i;
const IM_START_SYSTEM = /<\|im_start\|>\s*system/i;
const SYSTEM_TAG = /<\s*system\s*>/i;
const PEM_PRIVATE_KEY = /BEGIN [A-Z0-9 ]*PRIVATE KEY/;
const AWS_ACCESS_KEY = /\bAKIA[0-9A-Z]{16}\b/;
const GITHUB_PAT = /\b(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/;
const SLACK_TOKEN = /\bxox[baprs]-[A-Za-z0-9-]+/;

export function shouldScreenToolResults(input: {
  readonly posture: AgentSafetyPosture;
  readonly unattended: boolean;
}): boolean {
  if (input.unattended) {
    return true;
  }
  return input.posture !== "dangerous";
}

function payloadText(payload: unknown): string | null {
  if (typeof payload === "string") {
    return payload;
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return null;
  }
}

function deniesScreenText(text: string): boolean {
  const scan = text.length > SCAN_BYTES ? text.slice(0, SCAN_BYTES) : text;
  return (
    IGNORE_INSTRUCTIONS.test(scan) ||
    NEW_SYSTEM_PROMPT.test(scan) ||
    IM_START_SYSTEM.test(scan) ||
    SYSTEM_TAG.test(scan) ||
    PEM_PRIVATE_KEY.test(scan) ||
    AWS_ACCESS_KEY.test(scan) ||
    GITHUB_PAT.test(scan) ||
    SLACK_TOKEN.test(scan)
  );
}

export function evaluateToolResultScreening(payload: unknown): ToolResultScreening {
  const text = payloadText(payload);
  if (text === null) {
    return "deny";
  }
  return deniesScreenText(text) ? "deny" : "pass";
}

export function applyToolResultScreening<T>(
  output: T,
  input: {
    readonly posture: AgentSafetyPosture;
    readonly unattended: boolean;
  },
): T | string {
  if (!shouldScreenToolResults(input)) {
    return output;
  }
  if (evaluateToolResultScreening(output) === "deny") {
    return TOOL_RESULT_SCREENING_STUB;
  }
  return output;
}

type ScreenablePart = {
  readonly type: string;
  readonly output?: unknown;
};

type ScreenablePromptMessage = {
  readonly role: string;
  readonly content: string | readonly ScreenablePart[];
};

function screenPromptPart(
  part: ScreenablePart,
  input: {
    readonly posture: AgentSafetyPosture;
    readonly unattended: boolean;
  },
): ScreenablePart {
  if (part.type !== "tool-result") {
    return part;
  }
  const screened = applyToolResultScreening(part.output, input);
  if (screened === part.output) {
    return part;
  }
  return { ...part, output: { type: "text", value: TOOL_RESULT_SCREENING_STUB } };
}

export function screenLanguageModelPrompt<T extends ScreenablePromptMessage>(
  prompt: readonly T[],
  input: {
    readonly posture: AgentSafetyPosture;
    readonly unattended: boolean;
  },
): T[] {
  if (!shouldScreenToolResults(input)) {
    return [...prompt];
  }
  return prompt.map((message) => {
    if (typeof message.content === "string") {
      return message;
    }
    return {
      ...message,
      content: message.content.map((part) => screenPromptPart(part, input)),
    };
  });
}
