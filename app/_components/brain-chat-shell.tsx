"use client";

import { BrainAppShell } from "@/app/_components/brain-app-shell";
import { ChatWorkspace } from "@/app/_components/chat-workspace";

/** @deprecated Prefer `BrainAppShell` + `ChatWorkspace` via the app layout. */
export function BrainChatShell() {
  return (
    <BrainAppShell>
      <ChatWorkspace />
    </BrainAppShell>
  );
}
