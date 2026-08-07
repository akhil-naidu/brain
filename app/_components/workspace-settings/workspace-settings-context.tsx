"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useWorkspaceSettings } from "@/app/_components/workspace-settings/use-workspace-settings";

type WorkspaceSettingsContextValue = ReturnType<typeof useWorkspaceSettings>;

const WorkspaceSettingsContext = createContext<WorkspaceSettingsContextValue | null>(null);

export function WorkspaceSettingsProvider({ children }: { readonly children: ReactNode }) {
  const value = useWorkspaceSettings();
  return (
    <WorkspaceSettingsContext.Provider value={value}>{children}</WorkspaceSettingsContext.Provider>
  );
}

export function useWorkspaceSettingsContext(): WorkspaceSettingsContextValue {
  const value = useContext(WorkspaceSettingsContext);
  if (!value) {
    throw new Error("useWorkspaceSettingsContext must be used within WorkspaceSettingsProvider");
  }
  return value;
}
