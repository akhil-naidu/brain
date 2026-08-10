import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import {
  DEFAULT_BRAIN_CHAT_MODEL_ID,
  getBrainChatModel,
  isBrainChatModelId,
  isCustomBrainModelId,
} from "@/agent/lib/models";
import { isCommandCodeApiKeyConfigured } from "@/lib/chat/provider-setup";
import { customModelSelectableId, parseCustomModelRowId } from "@/lib/chat/custom-models/ids";
import { decryptCustomModelApiKey } from "@/lib/chat/custom-models/secret";
import { getCustomModelStore } from "@/lib/chat/custom-models/store";

export type ResolvedChatModel = {
  readonly model: LanguageModel;
  readonly modelContextWindowTokens: number;
  readonly selectableId: string;
};

const COMMAND_CODE_BASE_URL = "https://api.commandcode.ai/provider/v1";

function commandCodeClient(env: Record<string, string | undefined>) {
  return createOpenAI({
    apiKey: env.COMMAND_CODE_API_KEY,
    baseURL: COMMAND_CODE_BASE_URL,
    name: "commandcode",
  });
}

function openAiCompatibleClient(input: {
  readonly baseUrl: string;
  readonly apiKey: string | undefined;
  readonly name: string;
}) {
  return createOpenAI({
    apiKey: input.apiKey,
    baseURL: input.baseUrl,
    name: input.name,
  });
}

export function createCommandCodeFallbackModel(
  env: Record<string, string | undefined> = process.env,
): ResolvedChatModel {
  const meta = getBrainChatModel(DEFAULT_BRAIN_CHAT_MODEL_ID);
  return {
    model: commandCodeClient(env).chat(meta.id),
    modelContextWindowTokens: meta.contextWindowTokens,
    selectableId: meta.id,
  };
}

/**
 * Resolve a turn model id to a live LanguageModel.
 * Custom models are loaded from Postgres and checked against workspace visibility.
 */
export async function resolveChatModelSelection(input: {
  readonly modelId: string | null | undefined;
  readonly workspaceId: string | null | undefined;
  readonly env?: Record<string, string | undefined>;
}): Promise<ResolvedChatModel> {
  const env = input.env ?? process.env;
  const fallback = createCommandCodeFallbackModel(env);
  const requested = typeof input.modelId === "string" ? input.modelId.trim() : "";

  if (requested && isBrainChatModelId(requested) && isCommandCodeApiKeyConfigured(env)) {
    const meta = getBrainChatModel(requested);
    return {
      model: commandCodeClient(env).chat(meta.id),
      modelContextWindowTokens: meta.contextWindowTokens,
      selectableId: meta.id,
    };
  }

  if (requested && isCustomBrainModelId(requested)) {
    const rowId = parseCustomModelRowId(requested);
    if (rowId) {
      try {
        const row = await getCustomModelStore(env).getSecretById(rowId);
        if (row) {
          const visible =
            row.scope === "instance" ||
            (row.scope === "workspace" &&
              Boolean(input.workspaceId) &&
              row.workspaceId === input.workspaceId);
          if (visible) {
            let apiKey: string | undefined;
            if (row.apiKeyCiphertext) {
              try {
                apiKey = decryptCustomModelApiKey(row.apiKeyCiphertext, env);
              } catch {
                apiKey = undefined;
              }
            }
            const client = openAiCompatibleClient({
              baseUrl: row.baseUrl,
              apiKey,
              name: `custom-${row.id}`,
            });
            return {
              model: client.chat(row.providerModelId),
              modelContextWindowTokens: row.contextWindowTokens,
              selectableId: requested,
            };
          }
        }
      } catch {
        // Fall through to fallback rules.
      }
    }
  }

  if (isCommandCodeApiKeyConfigured(env)) {
    return fallback;
  }

  if (input.workspaceId) {
    try {
      const visible = await getCustomModelStore(env).listVisibleModels(input.workspaceId);
      const first = visible[0];
      if (first) {
        return resolveChatModelSelection({
          modelId: customModelSelectableId(first.id),
          workspaceId: input.workspaceId,
          env,
        });
      }
    } catch {
      // ignore
    }
  }

  return fallback;
}
