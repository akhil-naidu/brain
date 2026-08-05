"use client";

import { useRouter } from "next/navigation";
import { SchedulesPanel } from "@/components/chat/schedules-panel";
import { usePlaybooks } from "@/components/chat/use-playbooks";
import { chatUrl } from "@/lib/chat/chats-api";

export function SchedulesPage() {
  const router = useRouter();
  const { playbooks } = usePlaybooks();

  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <SchedulesPanel
          onOpenChat={(chatId) => {
            router.push(chatUrl(chatId));
          }}
          playbooks={playbooks}
          variant="page"
        />
      </div>
    </main>
  );
}
