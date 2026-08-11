import { defineDynamic, defineTool, type ToolDefinition } from "eve/tools";
import { shouldOmitHarnessTool } from "@/agent/lib/client-context-model";

/**
 * Replaces a built-in harness tool: omit it in Ask mode (plain chat),
 * keep the default in Agent mode.
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
            return defaultTool.execute(input, toolCtx);
          },
        });
      },
    },
  });
}
