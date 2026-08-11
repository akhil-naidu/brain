import { defineDynamic } from "eve/instructions";
import { syncTurnChatMode } from "@/agent/lib/turn-chat-mode-state";

/** Keep connection approval in sync with the newest turn client-context mode. */
export default defineDynamic({
  events: {
    "step.started": (_event, ctx) => {
      syncTurnChatMode(ctx.messages);
      return null;
    },
  },
});
