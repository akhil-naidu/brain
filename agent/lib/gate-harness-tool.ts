import { defineDynamic, defineTool, type ToolDefinition } from "eve/tools";
import { shouldOmitHarnessTool, type HarnessToolGate } from "@/agent/lib/client-context-model";

/**
 * Replaces a built-in harness tool with mode-aware availability:
 * - Ask: omit all harness tools
 * - Plan: omit when `gate` is `"mutating"` (write_file / bash)
 * - Agent / Debug: keep the default tool
 */
export function gateHarnessTool(defaultTool: ToolDefinition, gate: HarnessToolGate = "all") {
  return defineDynamic({
    events: {
      "step.started": (_event, ctx) => {
        if (shouldOmitHarnessTool(ctx.messages, gate)) {
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
