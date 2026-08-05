"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrainMark } from "@/components/brain-mark";
import { SchedulesPanel } from "@/components/chat/schedules-panel";
import { usePlaybooks } from "@/components/chat/use-playbooks";
import { Button } from "@/components/ui/button";
import { chatUrl } from "@/lib/chat/chats-api";

export function SchedulesPage() {
  const router = useRouter();
  const { playbooks } = usePlaybooks();

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
        <SchedulesPanel
          onOpenChat={(chatId) => {
            router.push(chatUrl(chatId));
          }}
          playbooks={playbooks}
          variant="page"
        />
      </main>
    </div>
  );
}
