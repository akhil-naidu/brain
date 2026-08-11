import { defineDynamic, defineInstructions } from "eve/instructions";
import { extractAttachedRepoFromMessages, isAskModeTurn } from "@/agent/lib/client-context-model";
import { buildAttachedRepoPlaybookMarkdown } from "@/agent/lib/attached-repo-playbook";
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
        markdown: buildAttachedRepoPlaybookMarkdown(label),
      });
    },
  },
});
