"use client";

import { Suspense, useMemo } from "react";
import { AccountProfileSection } from "@/app/_components/account-profile-section";
import { AccountSessionsSection } from "@/app/_components/account-sessions-section";
import { SettingsPanel, SettingsShell, SettingsTabs } from "@/components/settings/settings-shell";
import { SettingsRowsSkeleton } from "@/components/loading/skeletons";
import { useTabSearchParam } from "@/lib/navigation/use-tab-search-param";

const ACCOUNT_TABS = [
  { id: "profile", label: "Profile" },
  { id: "sessions", label: "Sessions" },
] as const;

function AccountSettingsPageInner() {
  const tabIds = useMemo(() => ACCOUNT_TABS.map((tab) => tab.id), []);
  const [tab, setTab] = useTabSearchParam({
    defaultTab: "profile",
    tabs: tabIds,
  });

  return (
    <SettingsShell
      description="Manage your profile, password, and signed-in devices on this host."
      title="Account"
    >
      <SettingsTabs
        active={tab}
        onChange={setTab}
        tabs={ACCOUNT_TABS.map((item) => ({ id: item.id, label: item.label }))}
      />

      {tab === "profile" ? <AccountProfileSection /> : null}
      {tab === "sessions" ? <AccountSessionsSection /> : null}
    </SettingsShell>
  );
}

export function AccountSettingsPage() {
  return (
    <Suspense
      fallback={
        <SettingsShell
          description="Manage your profile, password, and signed-in devices on this host."
          title="Account"
        >
          <SettingsPanel>
            <SettingsRowsSkeleton rows={4} />
          </SettingsPanel>
        </SettingsShell>
      }
    >
      <AccountSettingsPageInner />
    </Suspense>
  );
}
