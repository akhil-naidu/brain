"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  fetchScheduledBrief,
  runScheduledBriefNow,
  updateScheduledBrief,
} from "@/lib/chat/scheduled-brief-api";
import type { ScheduledBriefConfig } from "@/lib/chat/scheduled-brief-api";
import { formatScheduleLastRun } from "@/lib/chat/schedule-defaults";
import { cn } from "@/lib/utils";

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function formatTimeValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTimeValue(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const hour = Number.parseInt(match[1] ?? "", 10);
  const minute = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return null;
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    return null;
  }
  return { hour, minute };
}

function scheduleSummary(schedule: ScheduledBriefConfig, timeValue: string): string {
  if (!schedule.enabled) {
    return "Off — won’t run on a timer";
  }
  const days = schedule.weekdaysOnly ? "weekdays" : "every day";
  return `On · ${days} at ${timeValue}`;
}

export function ScheduledBriefPanel({
  className,
  disabled = false,
  idPrefix = "",
  onOpenChat,
}: {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly idPrefix?: string;
  readonly onOpenChat: (chatId: string) => void;
}) {
  const fieldId = (name: string) => `${idPrefix}${name}`;
  const [schedule, setSchedule] = useState<ScheduledBriefConfig | null>(null);
  const [timeValue, setTimeValue] = useState("09:00");
  const [slackChannelDraft, setSlackChannelDraft] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [running, setRunning] = useState(false);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchScheduledBrief();
        if (cancelled) {
          return;
        }
        const next = {
          ...result.schedule,
          timezone:
            result.schedule.timezone === "UTC" && !result.schedule.enabled
              ? browserTimeZone()
              : result.schedule.timezone,
        };
        setSchedule(next);
        setTimeValue(formatTimeValue(next.hour, next.minute));
        setSlackChannelDraft(next.slackChannel ?? "");
      } catch {
        if (!cancelled) {
          setLoadError("Unable to load morning brief.");
        }
      }
    })();
    return () => {
      cancelled = true;
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  const flashSaved = () => {
    setSavedFlash(true);
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current);
    }
    savedTimerRef.current = window.setTimeout(() => {
      setSavedFlash(false);
      savedTimerRef.current = null;
    }, 1600);
  };

  const persist = async (update: Parameters<typeof updateScheduledBrief>[0]) => {
    if (!schedule) {
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const result = await updateScheduledBrief({
        timezone: schedule.timezone,
        ...update,
      });
      setSchedule(result.schedule);
      setTimeValue(formatTimeValue(result.schedule.hour, result.schedule.minute));
      setSlackChannelDraft(result.schedule.slackChannel ?? "");
      flashSaved();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <p className={cn("text-muted-foreground mx-auto mt-6 max-w-md text-sm", className)}>
        {loadError}
      </p>
    );
  }

  if (!schedule) {
    return (
      <p className={cn("text-muted-foreground mx-auto mt-6 max-w-md text-sm", className)}>
        Loading…
      </p>
    );
  }

  const busy = disabled || saving || running;

  return (
    <div className={cn("mx-auto mt-6 w-full max-w-md text-left", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-muted-foreground/80 text-xs font-medium tracking-wide uppercase">
            Morning brief
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            Optional. Leave off if you don’t want a timed brief.
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
            schedule.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {schedule.enabled ? "On" : "Off"}
        </span>
      </div>

      <div className="border-border/60 bg-muted/20 flex flex-col gap-3 rounded-lg border px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <label
            className="min-w-0 text-sm leading-snug"
            htmlFor={fieldId("scheduled-brief-enabled")}
          >
            <span className="font-medium">Daily morning brief</span>
            <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
              {scheduleSummary(schedule, timeValue)}
            </span>
          </label>
          <Switch
            checked={schedule.enabled}
            className="mt-1"
            disabled={busy}
            id={fieldId("scheduled-brief-enabled")}
            onCheckedChange={(enabled) => {
              void persist({ enabled });
            }}
          />
        </div>

        {schedule.enabled ? (
          <>
            <div className="flex items-center justify-between gap-3 text-sm">
              <label htmlFor={fieldId("scheduled-brief-time")}>Time</label>
              <Input
                className="h-8 w-[7.5rem]"
                disabled={busy}
                id={fieldId("scheduled-brief-time")}
                onBlur={() => {
                  const parsed = parseTimeValue(timeValue);
                  if (!parsed) {
                    setTimeValue(formatTimeValue(schedule.hour, schedule.minute));
                    return;
                  }
                  if (parsed.hour === schedule.hour && parsed.minute === schedule.minute) {
                    return;
                  }
                  void persist({ hour: parsed.hour, minute: parsed.minute });
                }}
                onChange={(event) => {
                  setTimeValue(event.target.value);
                }}
                type="time"
                value={timeValue}
              />
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <label htmlFor={fieldId("scheduled-brief-weekdays")}>Weekdays only</label>
              <Switch
                checked={schedule.weekdaysOnly}
                disabled={busy}
                id={fieldId("scheduled-brief-weekdays")}
                onCheckedChange={(weekdaysOnly) => {
                  void persist({ weekdaysOnly });
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <label htmlFor={fieldId("scheduled-brief-slack")}>Also post to Slack</label>
              <Switch
                checked={schedule.slackDeliveryEnabled}
                disabled={busy}
                id={fieldId("scheduled-brief-slack")}
                onCheckedChange={(slackDeliveryEnabled) => {
                  void persist({ slackDeliveryEnabled });
                }}
              />
            </div>

            {schedule.slackDeliveryEnabled ? (
              <div className="flex flex-col gap-1.5 text-sm">
                <label htmlFor={fieldId("scheduled-brief-slack-channel")}>Slack channel</label>
                <Input
                  disabled={busy}
                  id={fieldId("scheduled-brief-slack-channel")}
                  onBlur={() => {
                    const next = slackChannelDraft.trim() || null;
                    if (next === (schedule.slackChannel ?? null)) {
                      return;
                    }
                    void persist({ slackChannel: next });
                  }}
                  onChange={(event) => {
                    setSlackChannelDraft(event.target.value);
                  }}
                  placeholder="#alerts or channel ID"
                  value={slackChannelDraft}
                />
              </div>
            ) : null}
          </>
        ) : null}

        <p className="text-muted-foreground/90 text-xs">
          {formatScheduleLastRun(schedule.lastRunAt, schedule.timezone)}
        </p>

        {schedule.lastSlackError ? (
          <p className="text-destructive text-xs leading-relaxed">{schedule.lastSlackError}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={busy}
            onClick={() => {
              void (async () => {
                setRunning(true);
                setActionError(null);
                try {
                  const brief = await runScheduledBriefNow(true);
                  if (brief.skipped) {
                    setActionError("Brief did not run.");
                    return;
                  }
                  if (brief.slack.attempted && !brief.slack.ok) {
                    setActionError(brief.slack.error);
                  }
                  try {
                    const latest = await fetchScheduledBrief();
                    setSchedule(latest.schedule);
                    setSlackChannelDraft(latest.schedule.slackChannel ?? "");
                  } catch {
                    // Opening the chat still succeeds if refresh fails.
                  }
                  onOpenChat(brief.chat.id);
                } catch (error) {
                  setActionError(
                    error instanceof Error ? error.message : "Unable to run morning brief.",
                  );
                } finally {
                  setRunning(false);
                }
              })();
            }}
            size="sm"
            type="button"
            variant="secondary"
          >
            {running ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : null}
            {running ? "Running…" : "Run once now"}
          </Button>

          {schedule.lastChatId ? (
            <Button
              disabled={disabled || running}
              onClick={() => {
                const chatId = schedule.lastChatId;
                if (chatId) {
                  onOpenChat(chatId);
                }
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              Open last chat
            </Button>
          ) : null}

          {saving ? (
            <span className="text-muted-foreground text-xs">Saving…</span>
          ) : savedFlash ? (
            <span className="text-muted-foreground text-xs">Saved</span>
          ) : null}
        </div>

        {actionError ? <p className="text-destructive text-xs">{actionError}</p> : null}
      </div>
    </div>
  );
}
