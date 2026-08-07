"use client";

import { useWorkspaceSettingsContext } from "@/app/_components/workspace-settings/workspace-settings-context";
import { WorkspaceScimSection } from "@/components/chat/workspace-scim-section";
import { WorkspaceSsoSection } from "@/components/chat/workspace-sso-section";

export function WorkspaceSignInSection() {
  const { canManage, isTeam } = useWorkspaceSettingsContext();

  return (
    <div className="space-y-6">
      <WorkspaceSsoSection canManage={canManage} enabled={isTeam} />
      <WorkspaceScimSection canManage={canManage} enabled={isTeam} />
    </div>
  );
}
