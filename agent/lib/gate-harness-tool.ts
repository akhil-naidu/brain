import { defineDynamic, defineTool, type ToolDefinition } from "eve/tools";
import { shouldOmitHarnessTool } from "@/agent/lib/client-context-model";
import { decideToolAuthorization } from "@/agent/lib/decide-tool-authorization";
import {
  ensureAttachedRepoCloned,
  principalForSandboxAuth,
} from "@/agent/lib/ensure-attached-repo";
import { resolveAgentSafetyPosture } from "@/agent/lib/resolve-agent-safety-posture";
import { turnChatMode } from "@/agent/lib/turn-chat-mode-state";
import { turnUnattended } from "@/agent/lib/turn-unattended-state";

export type GatedHarnessKind = "bash" | "write_file";

/**
 * Replaces a built-in harness tool: omit it in Ask mode (plain chat),
 * keep the default in Agent mode. Before execute, shallow-clone an attached
 * GitHub repo into `/workspace` when needed.
 */
export function gateHarnessTool(defaultTool: ToolDefinition, kind?: GatedHarnessKind) {
  return defineDynamic({
    events: {
      "step.started": (_event, ctx) => {
        if (shouldOmitHarnessTool(ctx.messages)) {
          return null;
        }
        return defineTool({
          ...defaultTool,
          ...(kind
            ? {
                approval: async ({ toolInput, toolName }) =>
                  decideToolAuthorization({
                    mode: turnChatMode.get(),
                    posture: await resolveAgentSafetyPosture(),
                    unattended: turnUnattended.get(),
                    toolKind: kind,
                    toolName,
                    isSafeRead: false,
                    args: toolInput,
                  }),
              }
            : {}),
          async execute(input, toolCtx) {
            const sandbox = await toolCtx.getSandbox();
            await ensureAttachedRepoCloned({
              messages: ctx.messages,
              sandbox,
              principal: principalForSandboxAuth(toolCtx.session.auth),
            });
            return defaultTool.execute(input, toolCtx);
          },
        });
      },
    },
  });
}
