"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ChatThreadActions } from "@/app/_components/ephemeral-agent-chat";

export type ChatNavHandlers = {
  readonly activeChatId: string | null;
  readonly currentTitle: string | null;
  readonly draftVisibility: "personal" | "shared";
  readonly threadActions: ChatThreadActions | null;
  readonly copyState: "idle" | "copied" | "error";
  readonly onCopyChat: () => void;
  readonly onDeleteChat: (chatId: string) => void;
  readonly onNewChat: () => void;
  readonly onNewSharedChat?: () => void;
  readonly onRenameChat: (chatId: string, title: string) => void | Promise<void>;
  readonly onShareChatApplied?: (chatId: string) => void | Promise<void>;
  readonly onRunPlaybook: (prompt: string) => void;
  readonly onSelectChat: (chatId: string) => void;
};

type ChatNavContextValue = {
  readonly handlers: ChatNavHandlers | null;
  readonly setHandlers: (handlers: ChatNavHandlers | null) => void;
};

const ChatNavContext = createContext<ChatNavContextValue | null>(null);

export function ChatNavProvider({ children }: { readonly children: ReactNode }) {
  const [handlers, setHandlers] = useState<ChatNavHandlers | null>(null);
  const value = useMemo(() => ({ handlers, setHandlers }), [handlers]);
  return <ChatNavContext.Provider value={value}>{children}</ChatNavContext.Provider>;
}

export function useChatNav() {
  const context = useContext(ChatNavContext);
  if (!context) {
    throw new Error("useChatNav must be used within ChatNavProvider");
  }
  return context;
}
