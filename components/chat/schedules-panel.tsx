"use client";

import Link from "next/link";
import { XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ScheduledBriefPanel } from "@/components/chat/scheduled-brief-panel";
import { ScheduledPlaybooksPanel } from "@/components/chat/scheduled-playbooks-panel";
import { Button } from "@/components/ui/button";
import {
  hasSchedulesPauseSnapshot,
  pauseAllSchedules,
  resumeAllSchedules,
} from "@/lib/chat/pause-all-schedules";
import type { Playbook } from "@/lib/chat/playbooks";
import { fetchScheduledBrief } from "@/lib/chat/scheduled-brief-api";
import { listScheduledPlaybooks } from "@/lib/chat/scheduled-playbooks-api";
import { cn } from "@/lib/utils";

export function SchedulesPanel({
  className,
  disabled = false,
  manageHref,
  onClose,
  onOpenChat,
  playbooks,
  refreshKey = 0,
  variant = "inline",
}: {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly manageHref?: string;
  readonly onClose?: () => void;
  readonly onOpenChat: (chatId: string) => void;
  readonly playbooks: readonly Playbook[];
  readonly refreshKey?: number;
  readonly variant?: "inline" | "page";
}) {
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
    void refreshPauseState();
  }, [refreshKey, panelKey, refreshPauseState]);

  const openChat = (chatId: string) => {
    onClose?.();
    onOpenChat(chatId);
  };

  return (
    <div
      className={cn(
        variant === "inline"
          ? "border-border/60 bg-card max-h-[min(52vh,32rem)] overflow-y-auto rounded-xl border p-4 shadow-sm"
          : "w-full",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          variant === "page" ? "mb-2 justify-end" : "mb-4 justify-between",
        )}
      >
        {variant === "inline" ? (
          <div className="min-w-0">
            <p className="text-base font-medium">Schedules</p>
          </div>
        ) : null}
        <div className="flex shrink-0 items-center gap-1">
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
          {manageHref ? (
            <Button asChild size="sm" type="button" variant="outline">
              <Link href={manageHref} onClick={() => onClose?.()}>
                Manage
              </Link>
            </Button>
          ) : null}
          {onClose ? (
            <Button
              aria-label="Close schedules"
              className="size-8"
              onClick={onClose}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <XIcon className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {pauseError ? <p className="text-destructive mb-3 text-xs">{pauseError}</p> : null}

      <div
        className={cn("flex flex-col", variant === "page" ? "gap-5" : "gap-4")}
        key={`${refreshKey}-${panelKey}`}
      >
        <ScheduledBriefPanel
          className="mx-0 mt-0 max-w-none"
          disabled={disabled || pauseBusy}
          idPrefix={`schedules-${variant}-brief-`}
          onOpenChat={openChat}
        />
        <ScheduledPlaybooksPanel
          className="mx-0 mt-0 max-w-none"
          disabled={disabled || pauseBusy}
          idPrefix={`schedules-${variant}-playbooks-`}
          onOpenChat={openChat}
          playbooks={playbooks}
        />
      </div>
    </div>
  );
}
