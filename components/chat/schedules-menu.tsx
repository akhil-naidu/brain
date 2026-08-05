"use client";

import { CalendarClockIcon } from "lucide-react";
import { useState } from "react";
import { ScheduledBriefPanel } from "@/components/chat/scheduled-brief-panel";
import { ScheduledPlaybooksPanel } from "@/components/chat/scheduled-playbooks-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Playbook } from "@/lib/chat/playbooks";
import { cn } from "@/lib/utils";

export function SchedulesMenu({
  disabled = false,
  onOpenChat,
  playbooks,
}: {
  readonly disabled?: boolean;
  readonly onOpenChat: (chatId: string) => void;
  readonly playbooks: readonly Playbook[];
}) {
  const [open, setOpen] = useState(false);

  const openChatAndClose = (chatId: string) => {
    setOpen(false);
    onOpenChat(chatId);
  };

  return (
    <>
      <button
        aria-label="Schedules"
        className={cn(
          "text-muted-foreground/75 hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground dark:text-muted-foreground/60 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        )}
        disabled={disabled}
        onClick={() => {
          setOpen(true);
        }}
        title="Schedules"
        type="button"
      >
        <CalendarClockIcon className="size-4" />
      </button>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="max-h-[min(90vh,42rem)] gap-0 overflow-y-auto sm:max-w-lg">
          <DialogHeader className="pb-2">
            <DialogTitle>Schedules</DialogTitle>
            <DialogDescription>
              Set when Brain should run your morning brief or saved playbooks.
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <div className="flex flex-col gap-2 pb-1">
              <ScheduledBriefPanel
                className="mx-0 mt-0 max-w-none"
                disabled={disabled}
                idPrefix="schedules-dialog-brief-"
                onOpenChat={openChatAndClose}
              />
              <ScheduledPlaybooksPanel
                className="mx-0 mt-0 max-w-none"
                disabled={disabled}
                idPrefix="schedules-dialog-playbooks-"
                onOpenChat={openChatAndClose}
                playbooks={playbooks}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
