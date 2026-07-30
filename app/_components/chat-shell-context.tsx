"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type EnabledConnections = {
  readonly clickup: boolean;
  readonly slack: boolean;
  readonly asana: boolean;
  readonly gmail: boolean;
};

type ChatShellValue = {
  readonly enabledConnections: EnabledConnections;
  readonly setConnectionEnabled: (key: keyof EnabledConnections, enabled: boolean) => void;
};

const ChatShellContext = createContext<ChatShellValue | null>(null);

export function ChatShellProvider({ children }: { readonly children: ReactNode }) {
  const [enabledConnections, setEnabledConnections] = useState<EnabledConnections>({
    clickup: true,
    slack: true,
    asana: true,
    gmail: true,
  });
  const setConnectionEnabled = useCallback((key: keyof EnabledConnections, enabled: boolean) => {
    setEnabledConnections((previous) => ({ ...previous, [key]: enabled }));
  }, []);

  const value = useMemo<ChatShellValue>(
    () => ({
      enabledConnections,
      setConnectionEnabled,
    }),
    [enabledConnections, setConnectionEnabled],
  );

  return <ChatShellContext.Provider value={value}>{children}</ChatShellContext.Provider>;
}

export function useChatShell() {
  const value = useContext(ChatShellContext);
  if (!value) throw new Error("useChatShell requires ChatShellProvider");
  return value;
}
