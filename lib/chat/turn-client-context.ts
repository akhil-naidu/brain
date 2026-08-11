import type { EnabledConnections } from "@/app/_components/chat-shell-context";
import { resolveBrainChatModelId } from "@/agent/lib/models";
import { resolveBrainChatMode, type BrainChatMode } from "@/lib/chat/chat-mode";
import { createConnectionClientContext } from "@/lib/chat/connection-context";

export type TurnClientContext = {
  readonly modelId: string;
  readonly mode: BrainChatMode;
  readonly workspaceId?: string;
  readonly connections: string;
};

const ASK_MODE_CONNECTIONS_GUIDANCE =
  "Ask mode: answer in plain language only. Do not call tools, shell, or connections.";

export function createTurnClientContext(input: {
  readonly enabledConnections: EnabledConnections;
  readonly modelId: string;
  readonly mode?: string | null;
  readonly workspaceId?: string | null;
}): TurnClientContext {
  const workspaceId = input.workspaceId?.trim();
  const mode = resolveBrainChatMode(input.mode);
  return {
    modelId: resolveBrainChatModelId(input.modelId),
    mode,
    ...(workspaceId ? { workspaceId } : {}),
    connections:
      mode === "ask"
        ? ASK_MODE_CONNECTIONS_GUIDANCE
        : createConnectionClientContext(input.enabledConnections),
  };
}
