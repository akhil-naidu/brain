import { createOpenAI } from "@ai-sdk/openai";
import { defineAgent, defineDynamic } from "eve";
import { extractSelectedModelIdFromMessages } from "./lib/client-context-model";
import { DEFAULT_BRAIN_CHAT_MODEL_ID, getBrainChatModel } from "./lib/models";

const commandcode = createOpenAI({
  apiKey: process.env.COMMAND_CODE_API_KEY,
  baseURL: "https://api.commandcode.ai/provider/v1",
  name: "commandcode",
});

const defaultModel = getBrainChatModel(DEFAULT_BRAIN_CHAT_MODEL_ID);

export default defineAgent({
  // Command Code exposes chat completions, not the OpenAI /responses API.
  // Live LanguageModel objects must be selected on step.started (not session/turn).
  model: defineDynamic({
    fallback: commandcode.chat(defaultModel.id),
    events: {
      "step.started": (_event, ctx) => {
        const selected = getBrainChatModel(extractSelectedModelIdFromMessages(ctx.messages));
        if (selected.id === defaultModel.id) {
          return null;
        }

        return {
          model: commandcode.chat(selected.id),
          modelContextWindowTokens: selected.contextWindowTokens,
        };
      },
    },
  }),
  // Required for non-Gateway models so compaction can size the context.
  modelContextWindowTokens: defaultModel.contextWindowTokens,
});
