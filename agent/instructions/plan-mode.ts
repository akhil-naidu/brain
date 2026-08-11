import { defineDynamic, defineInstructions } from "eve/instructions";
import { isPlanModeTurn } from "@/agent/lib/client-context-model";

export default defineDynamic({
  events: {
    "step.started": (_event, ctx) => {
      if (!isPlanModeTurn(ctx.messages)) {
        return null;
      }
      return defineInstructions({
        markdown: `# Plan mode

This turn is Plan mode: research and design, do not implement.

- Gather context with read-only tools (read, grep, glob, web fetch, skills, todos) and connections when needed.
- Do **not** write files, run shell, or perform create/update/send actions via connections.
- Produce a clear structured plan (goals, steps, risks, open questions). Prefer markdown headings and checklists.
- End by telling the user to switch to **Agent** mode when they want you to build the plan.
- If the user asks you to implement now, remind them to switch to Agent mode.`,
      });
    },
  },
});
