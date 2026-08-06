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

export type EnabledConnections = {
  readonly clickup: boolean;
  readonly slack: boolean;
  readonly asana: boolean;
  readonly gmail: boolean;
  readonly dflow: boolean;
  readonly github: boolean;
  readonly snowflake: boolean;
  readonly zernio: boolean;
};

type ChatShellValue = {
  readonly enabledConnections: EnabledConnections;
  readonly selectedModelId: string;
  readonly setConnectionEnabled: (key: keyof EnabledConnections, enabled: boolean) => void;
  readonly setSelectedModelId: (modelId: string) => void;
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

export function ChatShellProvider({ children }: { readonly children: ReactNode }) {
  const [enabledConnections, setEnabledConnections] = useState<EnabledConnections>({
    clickup: false,
    slack: false,
    asana: false,
    gmail: false,
    dflow: false,
    github: false,
    snowflake: false,
    zernio: false,
  });
  const [selectedModelId, setSelectedModelIdState] = useState(DEFAULT_BRAIN_CHAT_MODEL_ID);
  const [preferenceReady, setPreferenceReady] = useState(false);

  useEffect(() => {
    setSelectedModelIdState(readStoredModelId());
    setPreferenceReady(true);
  }, []);

  const setConnectionEnabled = useCallback((key: keyof EnabledConnections, enabled: boolean) => {
    setEnabledConnections((previous) => {
      if (previous[key] === enabled) {
        return previous;
      }
      return { ...previous, [key]: enabled };
    });
  }, []);

  const setSelectedModelId = useCallback((modelId: string) => {
    const resolved = resolveBrainChatModelId(modelId);
    setSelectedModelIdState(resolved);
    try {
      window.localStorage.setItem(BRAIN_SELECTED_MODEL_STORAGE_KEY, resolved);
    } catch {
      // Ignore quota / private mode failures; in-memory selection still works.
    }
  }, []);

  const value = useMemo<ChatShellValue>(
    () => ({
      enabledConnections,
      selectedModelId: preferenceReady ? selectedModelId : DEFAULT_BRAIN_CHAT_MODEL_ID,
      setConnectionEnabled,
      setSelectedModelId,
    }),
    [
      enabledConnections,
      preferenceReady,
      selectedModelId,
      setConnectionEnabled,
      setSelectedModelId,
    ],
  );

  return <ChatShellContext.Provider value={value}>{children}</ChatShellContext.Provider>;
}

export function useChatShell() {
  const value = useContext(ChatShellContext);
  if (!value) throw new Error("useChatShell requires ChatShellProvider");
  return value;
}
