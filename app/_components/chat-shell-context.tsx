"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BRAIN_SELECTED_MODEL_STORAGE_KEY,
  DEFAULT_BRAIN_CHAT_MODEL_ID,
  resolveBrainChatModelId,
} from "@/agent/lib/models";
import {
  BRAIN_CHAT_MODE_STORAGE_KEY,
  DEFAULT_BRAIN_CHAT_MODE,
  resolveBrainChatMode,
  type BrainChatMode,
} from "@/lib/chat/chat-mode";
import { fetchModelCatalog, type CatalogModelDto } from "@/lib/chat/custom-models-api";
import { defaultCatalogModelId } from "@/lib/chat/custom-models/catalog-shared";

export type EnabledConnections = {
  readonly clickup: boolean;
  readonly slack: boolean;
  readonly asana: boolean;
  readonly gmail: boolean;
  readonly notion: boolean;
  readonly linear: boolean;
  readonly atlassian: boolean;
  readonly zernio: boolean;
  readonly sentry: boolean;
  readonly dflow: boolean;
  readonly github: boolean;
  readonly snowflake: boolean;
  readonly mongodb: boolean;
  readonly toolbox: boolean;
  readonly rybbit: boolean;
  readonly bytebot: boolean;
};

type ChatShellValue = {
  readonly enabledConnections: EnabledConnections;
  readonly selectedModelId: string;
  readonly chatMode: BrainChatMode;
  readonly catalogModels: readonly CatalogModelDto[];
  readonly workspaceId: string | null;
  readonly catalogReady: boolean;
  readonly setConnectionEnabled: (key: keyof EnabledConnections, enabled: boolean) => void;
  readonly setSelectedModelId: (modelId: string) => void;
  readonly setChatMode: (mode: BrainChatMode) => void;
  readonly refreshModelCatalog: () => void;
};

const ChatShellContext = createContext<ChatShellValue | null>(null);

function readStoredModelId(): string {
  if (typeof window === "undefined") {
    return DEFAULT_BRAIN_CHAT_MODEL_ID;
  }

  try {
    return resolveBrainChatModelId(window.localStorage.getItem(BRAIN_SELECTED_MODEL_STORAGE_KEY));
  } catch {
    return DEFAULT_BRAIN_CHAT_MODEL_ID;
  }
}

function persistModelId(modelId: string): void {
  try {
    window.localStorage.setItem(BRAIN_SELECTED_MODEL_STORAGE_KEY, modelId);
  } catch {
    // Ignore quota / private mode failures; in-memory selection still works.
  }
}

function readStoredChatMode(): BrainChatMode {
  if (typeof window === "undefined") {
    return DEFAULT_BRAIN_CHAT_MODE;
  }
  try {
    return resolveBrainChatMode(window.localStorage.getItem(BRAIN_CHAT_MODE_STORAGE_KEY));
  } catch {
    return DEFAULT_BRAIN_CHAT_MODE;
  }
}

function persistChatMode(mode: BrainChatMode): void {
  try {
    window.localStorage.setItem(BRAIN_CHAT_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore quota / private mode failures; in-memory selection still works.
  }
}

export function ChatShellProvider({ children }: { readonly children: ReactNode }) {
  const [enabledConnections, setEnabledConnections] = useState<EnabledConnections>({
    clickup: false,
    slack: false,
    asana: false,
    gmail: false,
    notion: false,
    linear: false,
    atlassian: false,
    zernio: false,
    sentry: false,
    dflow: false,
    github: false,
    snowflake: false,
    mongodb: false,
    toolbox: false,
    rybbit: false,
    bytebot: false,
  });
  const [selectedModelId, setSelectedModelIdState] = useState(DEFAULT_BRAIN_CHAT_MODEL_ID);
  const [chatMode, setChatModeState] = useState<BrainChatMode>(DEFAULT_BRAIN_CHAT_MODE);
  const [preferenceReady, setPreferenceReady] = useState(false);
  const [catalogModels, setCatalogModels] = useState<readonly CatalogModelDto[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogTick, setCatalogTick] = useState(0);

  useEffect(() => {
    setSelectedModelIdState(readStoredModelId());
    setChatModeState(readStoredChatMode());
    setPreferenceReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const catalog = await fetchModelCatalog();
        if (cancelled) {
          return;
        }
        setCatalogModels(catalog.models);
        setWorkspaceId(catalog.workspaceId);
        setSelectedModelIdState((previous) => {
          const preferred = resolveBrainChatModelId(previous);
          if (catalog.models.some((model) => model.id === preferred)) {
            persistModelId(preferred);
            return preferred;
          }
          const next = defaultCatalogModelId(catalog.models);
          persistModelId(next);
          return next;
        });
      } catch {
        if (!cancelled) {
          setCatalogModels([]);
          setWorkspaceId(null);
        }
      } finally {
        if (!cancelled) {
          setCatalogReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogTick]);

  const setConnectionEnabled = useCallback((key: keyof EnabledConnections, enabled: boolean) => {
    setEnabledConnections((previous) => ({ ...previous, [key]: enabled }));
  }, []);

  const setSelectedModelId = useCallback(
    (modelId: string) => {
      const resolved = resolveBrainChatModelId(modelId);
      const next =
        catalogModels.length === 0 || catalogModels.some((model) => model.id === resolved)
          ? resolved
          : defaultCatalogModelId(catalogModels);
      setSelectedModelIdState(next);
      persistModelId(next);
    },
    [catalogModels],
  );

  const setChatMode = useCallback((mode: BrainChatMode) => {
    const next = resolveBrainChatMode(mode);
    setChatModeState(next);
    persistChatMode(next);
  }, []);

  const refreshModelCatalog = useCallback(() => {
    setCatalogTick((value) => value + 1);
  }, []);

  const value = useMemo<ChatShellValue>(
    () => ({
      enabledConnections,
      selectedModelId: preferenceReady ? selectedModelId : DEFAULT_BRAIN_CHAT_MODEL_ID,
      chatMode: preferenceReady ? chatMode : DEFAULT_BRAIN_CHAT_MODE,
      catalogModels,
      workspaceId,
      catalogReady,
      setConnectionEnabled,
      setSelectedModelId,
      setChatMode,
      refreshModelCatalog,
    }),
    [
      enabledConnections,
      preferenceReady,
      selectedModelId,
      chatMode,
      catalogModels,
      workspaceId,
      catalogReady,
      setConnectionEnabled,
      setSelectedModelId,
      setChatMode,
      refreshModelCatalog,
    ],
  );

  return <ChatShellContext.Provider value={value}>{children}</ChatShellContext.Provider>;
}

export function useChatShell() {
  const value = useContext(ChatShellContext);
  if (!value) throw new Error("useChatShell requires ChatShellProvider");
  return value;
}
