import { createOpenAI } from "@ai-sdk/openai";
import { defineAgent } from "eve";

const commandcode = createOpenAI({
  apiKey: process.env.COMMAND_CODE_API_KEY,
  baseURL: "https://api.commandcode.ai/provider/v1",
  name: "commandcode",
});

export default defineAgent({
  // Command Code exposes chat completions, not the OpenAI /responses API.
  model: commandcode.chat("deepseek/deepseek-v4-pro"),
  // Required for non-Gateway models so compaction can size the context.
  modelContextWindowTokens: 1_000_000,
});
