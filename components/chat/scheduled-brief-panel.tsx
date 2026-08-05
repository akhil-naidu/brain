"use client";

import { CheckIcon, CopyIcon, LoaderCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchScheduledBrief,
  runScheduledBriefNow,
  updateScheduledBrief,
} from "@/lib/chat/scheduled-brief-api";
import type { ScheduledBriefConfig } from "@/lib/chat/scheduled-brief-api";
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

export function ScheduledBriefPanel({
  className,
  disabled = false,
  onOpenChat,
}: {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly onOpenChat: (chatId: string) => void;
}) {
  const [schedule, setSchedule] = useState<ScheduledBriefConfig | null>(null);
  const [hostCron, setHostCron] = useState("");
  const [timeValue, setTimeValue] = useState("09:00");
  const [slackChannelDraft, setSlackChannelDraft] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

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
        setHostCron(result.hostCron);
      } catch {
        if (!cancelled) {
          setLoadError("Unable to load morning brief schedule.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      setHostCron(result.hostCron);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to save schedule.");
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
        Loading schedule…
      </p>
    );
  }

  return (
    <div className={cn("mx-auto mt-6 w-full max-w-md text-left", className)}>
      <p className="text-muted-foreground/80 mb-2 text-xs font-medium tracking-wide uppercase">
        Morning brief schedule
      </p>
      <div className="border-border/60 bg-muted/20 flex flex-col gap-3 rounded-lg border px-3 py-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <label htmlFor="scheduled-brief-enabled">Run automatically</label>
          <input
            checked={schedule.enabled}
            disabled={disabled || saving || running}
            id="scheduled-brief-enabled"
            onChange={(event) => {
              void persist({ enabled: event.target.checked });
            }}
            type="checkbox"
          />
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <label htmlFor="scheduled-brief-time">Local time</label>
          <Input
            className="h-8 w-[7.5rem]"
            disabled={disabled || saving || running}
            id="scheduled-brief-time"
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
          <label htmlFor="scheduled-brief-weekdays">Weekdays only</label>
          <input
            checked={schedule.weekdaysOnly}
            disabled={disabled || saving || running}
            id="scheduled-brief-weekdays"
            onChange={(event) => {
              void persist({ weekdaysOnly: event.target.checked });
            }}
            type="checkbox"
          />
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <label htmlFor="scheduled-brief-slack">Also post to Slack</label>
          <input
            checked={schedule.slackDeliveryEnabled}
            disabled={disabled || saving || running}
            id="scheduled-brief-slack"
            onChange={(event) => {
              void persist({ slackDeliveryEnabled: event.target.checked });
            }}
            type="checkbox"
          />
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor="scheduled-brief-slack-channel">Slack channel</label>
          <Input
            disabled={disabled || saving || running || !schedule.slackDeliveryEnabled}
            id="scheduled-brief-slack-channel"
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
            placeholder="#alerts or C0123ABC"
            value={slackChannelDraft}
          />
        </div>

        <p className="text-muted-foreground text-xs leading-relaxed">
          Uses {schedule.timezone}. Automatic runs need Brain running in production (`pnpm start`);
          while developing, use Run now or host cron. Slack posting uses your connected Slack
          account.
        </p>

        {schedule.lastSlackError ? (
          <p className="text-destructive text-xs leading-relaxed">{schedule.lastSlackError}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={disabled || saving || running}
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
                    setHostCron(latest.hostCron);
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
            {running ? "Running…" : "Run now"}
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
              Open last brief
            </Button>
          ) : null}
        </div>

        <div className="flex items-start gap-2">
          <code className="bg-background text-muted-foreground block max-h-16 flex-1 overflow-auto rounded px-2 py-1.5 text-[11px] leading-relaxed break-all">
            {hostCron}
          </code>
          <Button
            aria-label="Copy host cron"
            disabled={!hostCron}
            onClick={() => {
              void (async () => {
                await navigator.clipboard.writeText(hostCron);
                setCopied(true);
                window.setTimeout(() => {
                  setCopied(false);
                }, 1500);
              })();
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          </Button>
        </div>

        {actionError ? <p className="text-destructive text-xs">{actionError}</p> : null}
      </div>
    </div>
  );
}
