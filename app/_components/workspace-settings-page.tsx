"use client";

import { Suspense, useMemo } from "react";
import { WorkspaceInvitesSection } from "@/app/_components/workspace-settings/invites-section";
import { WorkspacePeopleSection } from "@/app/_components/workspace-settings/people-section";
import { WorkspaceSignInSection } from "@/app/_components/workspace-settings/sign-in-section";
import {
  useWorkspaceSettingsContext,
  WorkspaceSettingsProvider,
} from "@/app/_components/workspace-settings/workspace-settings-context";
import { SettingsRowsSkeleton } from "@/components/loading/skeletons";
import {
  SettingsBadge,
  SettingsPanel,
  SettingsShell,
  SettingsTabs,
} from "@/components/settings/settings-shell";
import { useTabSearchParam } from "@/lib/navigation/use-tab-search-param";

function WorkspaceSettingsPageInner() {
  const { error, isTeam, viewerRole, workspaceKind, workspaceName } = useWorkspaceSettingsContext();

  const tabs = useMemo(() => {
    const items = [{ id: "people", label: "People" }];
    if (isTeam) {
      items.push({ id: "invites", label: "Invites" }, { id: "sso", label: "Sign-in" });
    }
    return items;
  }, [isTeam]);

  const tabIds = useMemo(() => tabs.map((item) => item.id), [tabs]);
  const [tab, setTab] = useTabSearchParam({
    defaultTab: "people",
    ready: workspaceKind !== null,
    tabs: tabIds,
  });

  return (
    <SettingsShell
      description="Manage who can access this workspace and how they sign in."
      meta={
        <div className="flex flex-wrap items-center gap-2">
          {workspaceKind ? (
            <SettingsBadge>{workspaceKind === "personal" ? "Personal" : "Team"}</SettingsBadge>
          ) : null}
          {viewerRole ? <SettingsBadge>{viewerRole}</SettingsBadge> : null}
          {workspaceName ? (
            <span className="text-muted-foreground text-sm">{workspaceName}</span>
          ) : null}
        </div>
      }
      title="Workspace"
    >
      <SettingsTabs active={tab} onChange={setTab} tabs={tabs} />

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {tab === "people" ? <WorkspacePeopleSection /> : null}
      {tab === "invites" ? <WorkspaceInvitesSection /> : null}
      {tab === "sso" ? <WorkspaceSignInSection /> : null}
    </SettingsShell>
  );
}

export function WorkspaceSettingsPage() {
  return (
    <Suspense
      fallback={
        <SettingsShell
          description="Manage who can access this workspace and how they sign in."
          title="Workspace"
        >
          <SettingsPanel>
            <SettingsRowsSkeleton rows={4} />
          </SettingsPanel>
        </SettingsShell>
      }
    >
      <WorkspaceSettingsProvider>
        <WorkspaceSettingsPageInner />
      </WorkspaceSettingsProvider>
    </Suspense>
  );
}
