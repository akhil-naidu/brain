import type { Metadata } from "next";
import { Suspense } from "react";
import { ToolsPage } from "@/app/_components/tools-page";
import { SettingsCardsSkeleton } from "@/components/loading/skeletons";
import { SettingsPanel, SettingsShell } from "@/components/settings/settings-shell";

export const metadata: Metadata = {
  title: "Tools",
  description: "Connect MCP apps and browse loaded tools Brain can use in chat.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <SettingsShell
          description="Connect MCP apps and browse loaded tools Brain can use in chat."
          title="Tools"
        >
          <SettingsPanel className="p-4">
            <SettingsCardsSkeleton cards={4} />
          </SettingsPanel>
        </SettingsShell>
      }
    >
      <ToolsPage />
    </Suspense>
  );
}
