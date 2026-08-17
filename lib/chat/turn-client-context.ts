import type { EnabledConnections } from "@/app/_components/chat-shell-context";
import { resolveBrainChatModelId } from "@/agent/lib/models";
import { formatAttachedRepo, parseAttachedRepo, type AttachedRepo } from "@/lib/chat/attached-repo";
import { resolveBrainChatMode, type BrainChatMode } from "@/lib/chat/chat-mode";
import { createConnectionClientContext } from "@/lib/chat/connection-context";

export type TurnClientContext = {
  readonly modelId: string;
  readonly mode: BrainChatMode;
  readonly workspaceId?: string;
  /** `owner/name` or `owner/name@ref` when a GitHub repo is attached. */
  readonly repo?: string;
  readonly connections: string;
  /** Scheduled runs skip Strict HITL (command policy still applies). */
  readonly unattended?: boolean;
};

const ASK_MODE_CONNECTIONS_GUIDANCE =
  "Ask mode: answer in plain language only. Do not call tools, shell, or connections.";

export function createTurnClientContext(input: {
  readonly enabledConnections: EnabledConnections;
  readonly modelId: string;
  readonly mode?: string | null;
  readonly attachedRepo?: AttachedRepo | string | null;
  readonly workspaceId?: string | null;
  readonly unattended?: boolean;
}): TurnClientContext {
  const workspaceId = input.workspaceId?.trim();
  const mode = resolveBrainChatMode(input.mode);
  const attached =
    typeof input.attachedRepo === "string"
      ? parseAttachedRepo(input.attachedRepo)
      : (input.attachedRepo ?? null);
  return {
    modelId: resolveBrainChatModelId(input.modelId),
    mode,
    ...(workspaceId ? { workspaceId } : {}),
    ...(attached ? { repo: formatAttachedRepo(attached) } : {}),
    ...(input.unattended === true ? { unattended: true } : {}),
    connections:
      mode === "ask"
        ? ASK_MODE_CONNECTIONS_GUIDANCE
        : createConnectionClientContext(input.enabledConnections),
  };
}
