import {
  HOME_CHAT_DEMO_TURNS,
  type HomeChatDemoToolApp,
  type HomeChatDemoTurn,
} from "@/lib/features/catalog";

export type HomeChatDemoPhase = "idle" | "typing" | "sent" | "tool" | "stream" | "done";

export type HomeChatDemoMessage =
  | { readonly kind: "user"; readonly id: string; readonly text: string }
  | {
      readonly kind: "tool";
      readonly id: string;
      readonly app: HomeChatDemoToolApp;
      readonly action: string;
      readonly status: "running" | "done";
    }
  | {
      readonly kind: "assistant";
      readonly id: string;
      readonly text: string;
      readonly streaming: boolean;
    };

export type HomeChatDemoBeat = {
  readonly messages: readonly HomeChatDemoMessage[];
  readonly composer: string;
  readonly phase: HomeChatDemoPhase;
  readonly delayMs: number;
};

function userMessage(turnIndex: number, text: string): HomeChatDemoMessage {
  return { kind: "user", id: `user-${String(turnIndex)}`, text };
}

function toolMessage(
  turnIndex: number,
  turn: HomeChatDemoTurn,
  status: "running" | "done",
): HomeChatDemoMessage {
  return {
    kind: "tool",
    id: `tool-${String(turnIndex)}`,
    app: turn.tool.app,
    action: turn.tool.action,
    status,
  };
}

function assistantMessage(
  turnIndex: number,
  text: string,
  streaming: boolean,
): HomeChatDemoMessage {
  return { kind: "assistant", id: `assistant-${String(turnIndex)}`, text, streaming };
}

const TYPING_MS = 42;
const TYPING_HOLD_MS = 520;
const STREAM_MS = 28;
const IDLE_MS = 720;
const SEND_MS = 560;
const TOOL_RUN_MS = 1100;
const TOOL_DONE_MS = 320;
const TURN_HOLD_MS = 1400;
const LOOP_HOLD_MS = 3200;

export function homeChatDemoPosterMessages(
  turns: readonly HomeChatDemoTurn[] = HOME_CHAT_DEMO_TURNS,
): readonly HomeChatDemoMessage[] {
  const messages: HomeChatDemoMessage[] = [];
  for (const [turnIndex, turn] of turns.entries()) {
    messages.push(userMessage(turnIndex, turn.user));
    messages.push(toolMessage(turnIndex, turn, "done"));
    messages.push(assistantMessage(turnIndex, turn.assistant, false));
  }
  return messages;
}

/** Timed frames for the home chat demo. */
export function buildHomeChatDemoBeats(
  turns: readonly HomeChatDemoTurn[] = HOME_CHAT_DEMO_TURNS,
): readonly HomeChatDemoBeat[] {
  const beats: HomeChatDemoBeat[] = [];
  const completed: HomeChatDemoMessage[] = [];

  for (const [turnIndex, turn] of turns.entries()) {
    const isLastTurn = turnIndex === turns.length - 1;
    beats.push({
      messages: [...completed],
      composer: "",
      phase: "idle",
      delayMs: IDLE_MS,
    });
    for (let index = 1; index <= turn.user.length; index += 1) {
      beats.push({
        messages: [...completed],
        composer: turn.user.slice(0, index),
        phase: "typing",
        delayMs: index === turn.user.length ? TYPING_HOLD_MS : TYPING_MS,
      });
    }
    const withUser = [...completed, userMessage(turnIndex, turn.user)];
    beats.push({ messages: withUser, composer: "", phase: "sent", delayMs: SEND_MS });
    beats.push({
      messages: [...withUser, toolMessage(turnIndex, turn, "running")],
      composer: "",
      phase: "tool",
      delayMs: TOOL_RUN_MS,
    });
    const withTool = [...withUser, toolMessage(turnIndex, turn, "done")];
    beats.push({ messages: withTool, composer: "", phase: "tool", delayMs: TOOL_DONE_MS });
    for (let index = 1; index <= turn.assistant.length; index += 1) {
      beats.push({
        messages: [...withTool, assistantMessage(turnIndex, turn.assistant.slice(0, index), true)],
        composer: "",
        phase: "stream",
        delayMs: STREAM_MS,
      });
    }
    completed.push(
      userMessage(turnIndex, turn.user),
      toolMessage(turnIndex, turn, "done"),
      assistantMessage(turnIndex, turn.assistant, false),
    );
    beats.push({
      messages: [...completed],
      composer: "",
      phase: "done",
      delayMs: isLastTurn ? LOOP_HOLD_MS : TURN_HOLD_MS,
    });
  }
  return beats;
}
