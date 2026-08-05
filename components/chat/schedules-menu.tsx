"use client";

import { CalendarClockIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ScheduledBriefPanel } from "@/components/chat/scheduled-brief-panel";
import { ScheduledPlaybooksPanel } from "@/components/chat/scheduled-playbooks-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  hasSchedulesPauseSnapshot,
  pauseAllSchedules,
  resumeAllSchedules,
} from "@/lib/chat/pause-all-schedules";
import type { Playbook } from "@/lib/chat/playbooks";
import { fetchScheduledBrief } from "@/lib/chat/scheduled-brief-api";
import { listScheduledPlaybooks } from "@/lib/chat/scheduled-playbooks-api";
import { cn } from "@/lib/utils";

export function SchedulesMenu({
  disabled = false,
  onOpenChat,
  open: openControlled,
  onOpenChange,
  playbooks,
  refreshKey = 0,
}: {
  readonly disabled?: boolean;
  readonly onOpenChat: (chatId: string) => void;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly playbooks: readonly Playbook[];
  /** Bump to remount panels after external schedule changes. */
  readonly refreshKey?: number;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openControlled ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const [pauseBusy, setPauseBusy] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [canPause, setCanPause] = useState(false);
  const [canResume, setCanResume] = useState(false);
  const [panelKey, setPanelKey] = useState(0);

  const refreshPauseState = useCallback(async () => {
    try {
      const [brief, schedules] = await Promise.all([
        fetchScheduledBrief(),
        listScheduledPlaybooks(),
      ]);
      const anyEnabled = brief.schedule.enabled || schedules.some((item) => item.enabled);
      setCanPause(anyEnabled);
      setCanResume(hasSchedulesPauseSnapshot());
    } catch {
      setCanPause(false);
      setCanResume(hasSchedulesPauseSnapshot());
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    void refreshPauseState();
  }, [open, refreshKey, panelKey, refreshPauseState]);

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
            <div className="flex flex-wrap items-start justify-between gap-2 pr-8">
              <div className="min-w-0 space-y-1.5">
                <DialogTitle>Schedules</DialogTitle>
                <DialogDescription>
                  Optional timers. Morning brief stays off until you turn it on. Changes save as you
                  edit.
                </DialogDescription>
              </div>
              <div className="flex shrink-0 gap-1">
                {canResume ? (
                  <Button
                    disabled={disabled || pauseBusy}
                    onClick={() => {
                      void (async () => {
                        setPauseBusy(true);
                        setPauseError(null);
                        try {
                          await resumeAllSchedules();
                          setPanelKey((value) => value + 1);
                          await refreshPauseState();
                        } catch (error) {
                          setPauseError(
                            error instanceof Error ? error.message : "Unable to resume schedules.",
                          );
                        } finally {
                          setPauseBusy(false);
                        }
                      })();
                    }}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Resume
                  </Button>
                ) : null}
                {canPause ? (
                  <Button
                    disabled={disabled || pauseBusy}
                    onClick={() => {
                      void (async () => {
                        setPauseBusy(true);
                        setPauseError(null);
                        try {
                          await pauseAllSchedules();
                          setPanelKey((value) => value + 1);
                          await refreshPauseState();
                        } catch (error) {
                          setPauseError(
                            error instanceof Error ? error.message : "Unable to pause schedules.",
                          );
                        } finally {
                          setPauseBusy(false);
                        }
                      })();
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Pause all
                  </Button>
                ) : null}
              </div>
            </div>
            {pauseError ? <p className="text-destructive text-xs">{pauseError}</p> : null}
          </DialogHeader>
          {open ? (
            <div className="flex flex-col gap-2 pb-1" key={`${refreshKey}-${panelKey}`}>
              <ScheduledBriefPanel
                className="mx-0 mt-0 max-w-none"
                disabled={disabled || pauseBusy}
                idPrefix="schedules-dialog-brief-"
                onOpenChat={openChatAndClose}
              />
              <ScheduledPlaybooksPanel
                className="mx-0 mt-0 max-w-none"
                disabled={disabled || pauseBusy}
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
