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
  const days = schedule.weekdaysOnly ? "Weekdays" : "Every day";
  return `${days} at ${timeValue}`;
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
    <section
      className={cn(
        "border-border/60 bg-card mx-auto mt-6 w-full max-w-md overflow-hidden rounded-lg border text-left",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <div className="min-w-0">
          <label className="text-sm font-medium" htmlFor={fieldId("scheduled-brief-enabled")}>
            Morning brief
          </label>
          {schedule.enabled ? (
            <p className="text-muted-foreground mt-0.5 text-xs">
              {scheduleSummary(schedule, timeValue)}
              {" · "}
              {formatScheduleLastRun(schedule.lastRunAt, schedule.timezone)}
            </p>
          ) : (
            <p className="text-muted-foreground mt-0.5 text-xs">
              {formatScheduleLastRun(schedule.lastRunAt, schedule.timezone)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {saving ? (
            <span className="text-muted-foreground text-xs">Saving…</span>
          ) : savedFlash ? (
            <span className="text-muted-foreground text-xs">Saved</span>
          ) : null}
          <Switch
            checked={schedule.enabled}
            disabled={busy}
            id={fieldId("scheduled-brief-enabled")}
            onCheckedChange={(enabled) => {
              void persist({ enabled });
            }}
          />
        </div>
      </div>

      {schedule.enabled ? (
        <div className="border-border/60 flex flex-col gap-3 border-t px-3 py-3">
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
            <label htmlFor={fieldId("scheduled-brief-slack")}>Post to Slack</label>
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
              <label htmlFor={fieldId("scheduled-brief-slack-channel")}>Channel</label>
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
        </div>
      ) : null}

      {schedule.lastSlackError ? (
        <p className="text-destructive border-border/60 border-t px-3 py-2 text-xs leading-relaxed">
          {schedule.lastSlackError}
        </p>
      ) : null}

      <div className="border-border/60 flex flex-wrap items-center gap-2 border-t px-3 py-2.5">
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
          {running ? "Running…" : "Run once"}
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
            Last chat
          </Button>
        ) : null}
      </div>

      {actionError ? (
        <p className="text-destructive border-border/60 border-t px-3 py-2 text-xs">
          {actionError}
        </p>
      ) : null}
    </section>
  );
}
