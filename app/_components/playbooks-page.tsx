"use client";

import { useRouter } from "next/navigation";
import { PlaybooksPanel } from "@/components/chat/playbooks-panel";
import { usePlaybooks } from "@/components/chat/use-playbooks";
import { SettingsShell } from "@/components/settings/settings-shell";
import { stashPendingPlaybookRun } from "@/lib/chat/pending-playbook-run";

export function PlaybooksPage() {
  const router = useRouter();
  const { playbooks, savePlaybook, deletePlaybook } = usePlaybooks();

  return (
    <SettingsShell description="Save and edit prompts you reuse often." title="Playbooks">
      <PlaybooksPanel
        className="mx-0 mt-0 max-w-none"
        onDelete={deletePlaybook}
        onRun={(prompt) => {
          stashPendingPlaybookRun(prompt);
          router.push("/chat");
        }}
        onSave={savePlaybook}
        onScheduled={() => {
          router.push("/schedules");
        }}
        playbooks={playbooks}
        variant="page"
      />
    </SettingsShell>
  );
}
