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

export const BRAIN_ENABLED_CONNECTIONS_STORAGE_KEY = "brain.enabledConnections";

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

const DEFAULT_ENABLED_CONNECTIONS: EnabledConnections = {
  clickup: false,
  slack: false,
  asana: false,
  gmail: false,
  dflow: false,
  github: false,
  snowflake: false,
  zernio: false,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseStoredEnabledConnections(raw: string | null): EnabledConnections {
  if (!raw) {
    return DEFAULT_ENABLED_CONNECTIONS;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return DEFAULT_ENABLED_CONNECTIONS;
    }
    return {
      clickup: parsed.clickup === true,
      slack: parsed.slack === true,
      asana: parsed.asana === true,
      gmail: parsed.gmail === true,
      dflow: parsed.dflow === true,
      github: parsed.github === true,
      snowflake: parsed.snowflake === true,
      zernio: parsed.zernio === true,
    };
  } catch {
    return DEFAULT_ENABLED_CONNECTIONS;
  }
}

function readStoredEnabledConnections(): EnabledConnections {
  if (typeof window === "undefined") {
    return DEFAULT_ENABLED_CONNECTIONS;
  }
  try {
    return parseStoredEnabledConnections(
      window.localStorage.getItem(BRAIN_ENABLED_CONNECTIONS_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_ENABLED_CONNECTIONS;
  }
}

function persistEnabledConnections(value: EnabledConnections): void {
  try {
    window.localStorage.setItem(BRAIN_ENABLED_CONNECTIONS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore quota / private mode failures; in-memory toggles still work.
  }
}

export function ChatShellProvider({ children }: { readonly children: ReactNode }) {
  const [enabledConnections, setEnabledConnections] = useState<EnabledConnections>(
    DEFAULT_ENABLED_CONNECTIONS,
  );
  const [selectedModelId, setSelectedModelIdState] = useState(DEFAULT_BRAIN_CHAT_MODEL_ID);
  const [preferenceReady, setPreferenceReady] = useState(false);

  useEffect(() => {
    setEnabledConnections(readStoredEnabledConnections());
    setSelectedModelIdState(readStoredModelId());
    setPreferenceReady(true);
  }, []);

  const setConnectionEnabled = useCallback((key: keyof EnabledConnections, enabled: boolean) => {
    setEnabledConnections((previous) => {
      if (previous[key] === enabled) {
        return previous;
      }
      const next = { ...previous, [key]: enabled };
      persistEnabledConnections(next);
      return next;
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
      enabledConnections: preferenceReady ? enabledConnections : DEFAULT_ENABLED_CONNECTIONS,
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
