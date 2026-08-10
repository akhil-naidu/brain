import type { EnabledConnections } from "@/app/_components/chat-shell-context";
import { createConnectionClientContext } from "@/lib/chat/connection-context";
import { resolveBrainChatModelId } from "@/agent/lib/models";

export type TurnClientContext = {
  readonly modelId: string;
  readonly workspaceId?: string;
  readonly connections: string;
};

export function createTurnClientContext(input: {
  readonly enabledConnections: EnabledConnections;
  readonly modelId: string;
  readonly workspaceId?: string | null;
}): TurnClientContext {
  const workspaceId = input.workspaceId?.trim();
  return {
    modelId: resolveBrainChatModelId(input.modelId),
    ...(workspaceId ? { workspaceId } : {}),
    connections: createConnectionClientContext(input.enabledConnections),
  };
}
