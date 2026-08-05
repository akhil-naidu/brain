"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrainMark } from "@/components/brain-mark";
import { PlaybooksPanel } from "@/components/chat/playbooks-panel";
import { usePlaybooks } from "@/components/chat/use-playbooks";
import { Button } from "@/components/ui/button";
import { stashPendingPlaybookRun } from "@/lib/chat/pending-playbook-run";

export function PlaybooksPage() {
  const router = useRouter();
  const { playbooks, savePlaybook, deletePlaybook } = usePlaybooks();

  return (
    <div className="bg-background min-h-dvh">
      <header className="border-border/60 flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <Link className="flex items-center gap-2" href="/chat">
          <BrainMark className="size-7" />
          <span className="text-sm font-medium">Brain</span>
        </Link>
        <Button asChild size="sm" variant="ghost">
          <Link href="/chat">Back to chat</Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
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
      </main>
    </div>
  );
}
