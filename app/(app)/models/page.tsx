import type { Metadata } from "next";
import { Suspense } from "react";
import { ModelsPage } from "@/app/_components/models-page";
import { SettingsCardsSkeleton } from "@/components/loading/skeletons";
import { SettingsPanel, SettingsShell } from "@/components/settings/settings-shell";

export const metadata: Metadata = {
  title: "Models",
  description: "Manage instance and workspace OpenAI-compatible chat models.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <SettingsShell
          description="Manage instance and workspace OpenAI-compatible chat models."
          title="Models"
        >
          <SettingsPanel className="p-4">
            <SettingsCardsSkeleton cards={3} />
          </SettingsPanel>
        </SettingsShell>
      }
    >
      <ModelsPage />
    </Suspense>
  );
}
