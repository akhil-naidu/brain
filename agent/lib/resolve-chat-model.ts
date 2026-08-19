import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import {
  DEFAULT_BRAIN_CHAT_MODEL_ID,
  getBrainChatModel,
  isBrainChatModelId,
  isCustomBrainModelId,
} from "@/agent/lib/models";
import { wrapChatModelWithToolResultScreening } from "@/agent/lib/wrap-chat-model-screening";
import {
  firstEnabledBuiltinModelId,
  isBuiltinModelEnabled,
} from "@/lib/chat/builtin-models/availability";
import { getBuiltinModelStore } from "@/lib/chat/builtin-models/store";
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

/**
 * Local OpenAI-compatible servers (Ollama, LM Studio) often need no real key.
 * `@ai-sdk/openai` still requires a non-empty apiKey or the turn fails as
 * “provider API key missing” before the request reaches the host.
 */
const OPENAI_COMPAT_PLACEHOLDER_API_KEY = "ollama";

function screenedModel(model: LanguageModel): LanguageModel {
  if (typeof model === "string") {
    return model;
  }
  return wrapChatModelWithToolResultScreening(model);
}

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
  const apiKey = input.apiKey?.trim() || OPENAI_COMPAT_PLACEHOLDER_API_KEY;
  return createOpenAI({
    apiKey,
    baseURL: input.baseUrl,
    name: input.name,
  });
}

export function createCommandCodeFallbackModel(
  env: Record<string, string | undefined> = process.env,
): ResolvedChatModel {
  const meta = getBrainChatModel(DEFAULT_BRAIN_CHAT_MODEL_ID);
  return {
    model: screenedModel(commandCodeClient(env).chat(meta.id)),
    modelContextWindowTokens: meta.contextWindowTokens,
    selectableId: meta.id,
  };
}

/**
 * Resolve a turn model id to a live LanguageModel.
 * Custom models are loaded from Postgres and checked against workspace visibility.
 */
async function loadDisabledModelIds(
  workspaceId: string | null | undefined,
  list: (workspaceId: string) => Promise<readonly string[]>,
): Promise<readonly string[]> {
  if (!workspaceId) {
    return [];
  }
  try {
    return await list(workspaceId);
  } catch {
    return [];
  }
}

function resolveEnabledCommandCodeModel(
  modelId: string,
  env: Record<string, string | undefined>,
): ResolvedChatModel {
  const meta = getBrainChatModel(modelId);
  return {
    model: screenedModel(commandCodeClient(env).chat(meta.id)),
    modelContextWindowTokens: meta.contextWindowTokens,
    selectableId: meta.id,
  };
}

export async function resolveChatModelSelection(input: {
  readonly modelId: string | null | undefined;
  readonly workspaceId: string | null | undefined;
  readonly env?: Record<string, string | undefined>;
}): Promise<ResolvedChatModel> {
  const env = input.env ?? process.env;
  const fallback = createCommandCodeFallbackModel(env);
  const requested = typeof input.modelId === "string" ? input.modelId.trim() : "";
  const customStore = getCustomModelStore(env);
  const [disabledBuiltinIds, disabledCustomIds] = await Promise.all([
    loadDisabledModelIds(input.workspaceId, (workspaceId) =>
      getBuiltinModelStore(env).listDisabledModelIds(workspaceId),
    ),
    loadDisabledModelIds(input.workspaceId, (workspaceId) =>
      customStore.listDisabledModelIds(workspaceId),
    ),
  ]);

  if (
    requested &&
    isBrainChatModelId(requested) &&
    isCommandCodeApiKeyConfigured(env) &&
    isBuiltinModelEnabled(requested, disabledBuiltinIds)
  ) {
    return resolveEnabledCommandCodeModel(requested, env);
  }

  if (requested && isCustomBrainModelId(requested)) {
    const rowId = parseCustomModelRowId(requested);
    if (rowId && !disabledCustomIds.includes(rowId)) {
      try {
        const row = await customStore.getSecretById(rowId);
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
              model: screenedModel(client.chat(row.providerModelId)),
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
    const enabledId = firstEnabledBuiltinModelId(disabledBuiltinIds);
    if (enabledId) {
      return resolveEnabledCommandCodeModel(enabledId, env);
    }
  }

  if (input.workspaceId) {
    try {
      const visible = await customStore.listVisibleModels(input.workspaceId);
      const first = visible.find((model) => !disabledCustomIds.includes(model.id));
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
