import { defineDynamic } from "eve/instructions";
import { syncTurnChatMode } from "@/agent/lib/turn-chat-mode-state";
import { syncTurnUnattended } from "@/agent/lib/turn-unattended-state";

/** Keep connection approval in sync with the newest turn client-context mode. */
export default defineDynamic({
  events: {
    "step.started": (_event, ctx) => {
      syncTurnChatMode(ctx.messages);
      syncTurnUnattended(ctx.messages);
      return null;
    },
  },
});
