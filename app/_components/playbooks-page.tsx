"use client";

import { useRouter } from "next/navigation";
import { PlaybooksPanel } from "@/components/chat/playbooks-panel";
import { usePlaybooks } from "@/components/chat/use-playbooks";
import { stashPendingPlaybookRun } from "@/lib/chat/pending-playbook-run";

export function PlaybooksPage() {
  const router = useRouter();
  const { playbooks, savePlaybook, deletePlaybook } = usePlaybooks();

  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-5">
          <h1 className="text-xl font-medium">Playbooks</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Save and edit prompts you reuse often.
          </p>
        </div>
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
      </div>
    </main>
  );
}
