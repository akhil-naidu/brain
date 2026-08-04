import type { EnabledConnections } from "@/app/_components/chat-shell-context";
import { createConnectionClientContext } from "@/lib/chat/connection-context";
import { resolveBrainChatModelId } from "@/agent/lib/models";

export type TurnClientContext = {
  readonly modelId: string;
  readonly connections: string;
};

export function createTurnClientContext(input: {
  readonly enabledConnections: EnabledConnections;
  readonly modelId: string;
}): TurnClientContext {
  return {
    modelId: resolveBrainChatModelId(input.modelId),
    connections: createConnectionClientContext(input.enabledConnections),
  };
}
