"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Playbook } from "@/lib/chat/playbooks";
import {
  formatScheduleTimeValue,
  parseScheduleTimeValue,
  readScheduleDefaultTime,
} from "@/lib/chat/schedule-defaults";
import { schedulePlaybookQuick } from "@/lib/chat/schedule-from-playbook";

export function SchedulePlaybookDialog({
  open,
  playbook,
  onOpenChange,
  onScheduled,
}: {
  readonly open: boolean;
  readonly playbook: Playbook | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onScheduled: () => void;
}) {
  const [timeValue, setTimeValue] = useState("09:00");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const defaults = readScheduleDefaultTime();
    setTimeValue(formatScheduleTimeValue(defaults.hour, defaults.minute));
    setError(null);
    setSaving(false);
  }, [open, playbook]);

  const canSave = playbook !== null && parseScheduleTimeValue(timeValue) !== null;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule playbook</DialogTitle>
          <DialogDescription>
            {playbook
              ? `Run “${playbook.label}” on weekdays at this local time. You can change details in Schedules.`
              : "Pick a local time for this playbook."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <label className="text-foreground text-sm font-medium" htmlFor="schedule-playbook-time">
            Local time
          </label>
          <Input
            className="h-9 w-[7.5rem]"
            disabled={saving || !playbook}
            id="schedule-playbook-time"
            onChange={(event) => {
              setTimeValue(event.target.value);
            }}
            type="time"
            value={timeValue}
          />
        </div>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            disabled={saving}
            onClick={() => {
              onOpenChange(false);
            }}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={!canSave || saving}
            onClick={() => {
              if (!playbook) {
                return;
              }
              const parsed = parseScheduleTimeValue(timeValue);
              if (!parsed) {
                setError("Pick a valid time.");
                return;
              }
              void (async () => {
                setSaving(true);
                setError(null);
                try {
                  const result = await schedulePlaybookQuick(playbook, parsed);
                  if (result.status === "at_limit") {
                    setError("You already have the maximum number of schedules.");
                    return;
                  }
                  onOpenChange(false);
                  onScheduled();
                } catch (scheduleError) {
                  setError(
                    scheduleError instanceof Error
                      ? scheduleError.message
                      : "Unable to schedule playbook.",
                  );
                } finally {
                  setSaving(false);
                }
              })();
            }}
            type="button"
          >
            {saving ? "Scheduling…" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
