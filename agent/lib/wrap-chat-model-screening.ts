import { wrapLanguageModel, type LanguageModel } from "ai";
import { resolveAgentSafetyPosture } from "@/agent/lib/resolve-agent-safety-posture";
import { screenLanguageModelPrompt } from "@/agent/lib/screen-tool-result";
import { turnUnattended } from "@/agent/lib/turn-unattended-state";

type WrapableChatModel = Parameters<typeof wrapLanguageModel>[0]["model"];

export function wrapChatModelWithToolResultScreening(model: WrapableChatModel): LanguageModel {
  return wrapLanguageModel({
    model,
    middleware: {
      specificationVersion: "v4",
      async transformParams({ params }) {
        return {
          ...params,
          prompt: screenLanguageModelPrompt(params.prompt, {
            posture: await resolveAgentSafetyPosture(),
            unattended: turnUnattended.get(),
          }),
        };
      },
    },
  });
}
