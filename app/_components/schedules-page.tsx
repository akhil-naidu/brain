"use client";

import { useRouter } from "next/navigation";
import { SchedulesPanel } from "@/components/chat/schedules-panel";
import { usePlaybooks } from "@/components/chat/use-playbooks";
import { SettingsShell } from "@/components/settings/settings-shell";
import { chatUrl } from "@/lib/chat/chats-api";

export function SchedulesPage() {
  const router = useRouter();
  const { playbooks } = usePlaybooks();

  return (
    <SettingsShell
      description="Morning brief and playbook timers for this workspace."
      title="Schedules"
    >
      <SchedulesPanel
        onOpenChat={(chatId) => {
          router.push(chatUrl(chatId));
        }}
        playbooks={playbooks}
        variant="page"
      />
    </SettingsShell>
  );
}
