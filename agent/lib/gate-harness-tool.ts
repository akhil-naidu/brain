import { defineDynamic, defineTool, type ToolDefinition } from "eve/tools";
import { shouldOmitHarnessTool } from "@/agent/lib/client-context-model";
import {
  ensureAttachedRepoCloned,
  principalForSandboxAuth,
} from "@/agent/lib/ensure-attached-repo";

/**
 * Replaces a built-in harness tool: omit it in Ask mode (plain chat),
 * keep the default in Agent mode. Before execute, shallow-clone an attached
 * GitHub repo into `/workspace` when needed.
 */
export function gateHarnessTool(defaultTool: ToolDefinition) {
  return defineDynamic({
    events: {
      "step.started": (_event, ctx) => {
        if (shouldOmitHarnessTool(ctx.messages)) {
          return null;
        }
        return defineTool({
          ...defaultTool,
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
