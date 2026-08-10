import { defineAgent, defineDynamic } from "eve";
import {
  extractSelectedModelIdFromMessages,
  extractWorkspaceIdFromMessages,
} from "./lib/client-context-model";
import {
  createCommandCodeFallbackModel,
  resolveChatModelSelection,
} from "./lib/resolve-chat-model";

const fallback = createCommandCodeFallbackModel();

export default defineAgent({
  // Command Code exposes chat completions, not the OpenAI /responses API.
  // Live LanguageModel objects must be selected on step.started (not session/turn).
  model: defineDynamic({
    fallback: fallback.model,
    events: {
      "step.started": async (_event, ctx) => {
        const authWorkspace =
          typeof ctx.session.auth.current?.attributes?.workspaceId === "string"
            ? ctx.session.auth.current.attributes.workspaceId
            : typeof ctx.session.auth.initiator?.attributes?.workspaceId === "string"
              ? ctx.session.auth.initiator.attributes.workspaceId
              : null;
        const workspaceId = extractWorkspaceIdFromMessages(ctx.messages) ?? authWorkspace ?? null;
        const selected = await resolveChatModelSelection({
          modelId: extractSelectedModelIdFromMessages(ctx.messages),
          workspaceId,
        });

        if (selected.selectableId === fallback.selectableId) {
          return null;
        }

        return {
          model: selected.model,
          modelContextWindowTokens: selected.modelContextWindowTokens,
        };
      },
    },
  }),
  // Required for non-Gateway models so compaction can size the context.
  modelContextWindowTokens: fallback.modelContextWindowTokens,
});
