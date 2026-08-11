import { defineDynamic, defineInstructions } from "eve/instructions";
import { isAskModeTurn } from "@/agent/lib/client-context-model";

export default defineDynamic({
  events: {
    "step.started": (_event, ctx) => {
      if (!isAskModeTurn(ctx.messages)) {
        return null;
      }
      return defineInstructions({
        markdown: `# Ask mode

This turn is Ask mode: plain chat only.

- Answer in natural language. Do not call tools, shell, file tools, web fetch/search, todos, skills, or connections.
- Do not use ask_question or connection_search. If you need clarification, ask in the reply text.
- If the user needs tools, tell them to switch to Agent mode.`,
      });
    },
  },
});
