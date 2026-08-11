import { defineDynamic, defineInstructions } from "eve/instructions";
import { extractAttachedRepoFromMessages, isAskModeTurn } from "@/agent/lib/client-context-model";
import { formatAttachedRepo } from "@/lib/chat/attached-repo";

export default defineDynamic({
  events: {
    "step.started": (_event, ctx) => {
      if (isAskModeTurn(ctx.messages)) {
        return null;
      }
      const repo = extractAttachedRepoFromMessages(ctx.messages);
      if (!repo) {
        return null;
      }
      const label = formatAttachedRepo(repo);
      return defineInstructions({
        markdown: `# Attached repository

The user attached GitHub repository \`${label}\`.

- Prefer harness tools (\`bash\`, \`read_file\`, \`write_file\`, \`glob\`, \`grep\`) against the checkout at \`/workspace\`. The first harness tool call clones the repo there if needed.
- Use GitHub MCP for remote operations (issues, pull requests, reviews, notifications) — not for routine local file edits.
- Do not re-clone manually unless the user changes the attached repo.`,
      });
    },
  },
});
