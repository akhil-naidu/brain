import { defineDynamic, defineInstructions } from "eve/instructions";
import { isDebugModeTurn } from "@/agent/lib/client-context-model";

export default defineDynamic({
  events: {
    "step.started": (_event, ctx) => {
      if (!isDebugModeTurn(ctx.messages)) {
        return null;
      }
      return defineInstructions({
        markdown: `# Debug mode

This turn is Debug mode: evidence-first diagnosis and targeted fixes.

- Form brief hypotheses about the failure before changing much code.
- Prefer gathering evidence (logs, stack traces, failing tests, reading relevant files) over speculative large rewrites.
- Make the smallest change that validates or falsifies a hypothesis, then report what you learned.
- Tools and connections are available — use them when they produce evidence or confirm a fix.
- Summarize root cause and the fix clearly when done.`,
      });
    },
  },
});
