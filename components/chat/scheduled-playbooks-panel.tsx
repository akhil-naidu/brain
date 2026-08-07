"use client";

import { LoaderCircleIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PanelSkeleton } from "@/components/loading/skeletons";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Playbook } from "@/lib/chat/playbooks";
import { formatScheduleLastRun } from "@/lib/chat/schedule-defaults";
import { notifySchedulesChanged } from "@/lib/chat/schedule-events";
import {
  createScheduledPlaybookApi,
  deleteScheduledPlaybookApi,
  listScheduledPlaybooks,
  MAX_SCHEDULED_PLAYBOOKS,
  runScheduledPlaybookNow,
  updateScheduledPlaybookApi,
  type ScheduledPlaybook,
} from "@/lib/chat/scheduled-playbooks-api";
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

export function ScheduledPlaybooksPanel({
  className,
  disabled = false,
  idPrefix = "",
  onOpenChat,
  playbooks,
}: {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly idPrefix?: string;
  readonly onOpenChat: (chatId: string) => void;
  readonly playbooks: readonly Playbook[];
}) {
  const fieldId = (name: string) => `${idPrefix}${name}`;
  const [schedules, setSchedules] = useState<readonly ScheduledPlaybook[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newSlack, setNewSlack] = useState(false);
  const [newSlackChannel, setNewSlackChannel] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    const listed = await listScheduledPlaybooks();
    setSchedules(listed);
    notifySchedulesChanged();
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const listed = await listScheduledPlaybooks();
        if (!cancelled) {
          setSchedules(listed);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Unable to load playbook schedules.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPlaybookId && playbooks[0]) {
      setSelectedPlaybookId(playbooks[0].id);
    }
  }, [playbooks, selectedPlaybookId]);

  if (loadError) {
    return (
      <p className={cn("text-muted-foreground mx-auto mt-6 max-w-md text-sm", className)}>
        {loadError}
      </p>
    );
  }

  if (!schedules) {
    return <PanelSkeleton className={cn("mt-6", className)} />;
  }

  const atLimit = schedules.length >= MAX_SCHEDULED_PLAYBOOKS;
  const noPlaybooks = playbooks.length === 0;

  return (
    <section
      className={cn(
        "border-border/60 bg-card mx-auto mt-6 w-full max-w-md overflow-hidden rounded-xl border text-left",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3.5">
        <p className="text-sm font-medium">Playbooks</p>
        {noPlaybooks ? (
          <Button asChild className="h-7 px-2 text-xs" size="sm" variant="ghost">
            <Link href="/playbooks" title="Save a playbook first, then schedule it">
              <PlusIcon className="size-3.5" />
              Create
            </Link>
          </Button>
        ) : (
          <Button
            className="h-7 px-2 text-xs"
            disabled={disabled || atLimit}
            onClick={() => {
              setAdding((open) => !open);
              setActionError(null);
            }}
            size="sm"
            title={
              atLimit
                ? `You can schedule up to ${MAX_SCHEDULED_PLAYBOOKS} playbooks.`
                : "Add a playbook schedule"
            }
            type="button"
            variant="ghost"
          >
            <PlusIcon className="size-3.5" />
            Add
          </Button>
        )}
      </div>

      {adding ? (
        <div className="border-border/60 flex flex-col gap-3 border-t px-4 py-3.5">
          <Field>
            <FieldLabel htmlFor={fieldId("schedule-playbook-select")}>Playbook</FieldLabel>
            <FieldSelect
              disabled={disabled || creating}
              id={fieldId("schedule-playbook-select")}
              onValueChange={setSelectedPlaybookId}
              options={playbooks.map((item) => ({
                value: item.id,
                label: item.label,
              }))}
              value={selectedPlaybookId}
            />
          </Field>
          <div className="flex items-center justify-between gap-3 text-sm">
            <label htmlFor={fieldId("schedule-playbook-time")}>Time</label>
            <Input
              className="h-8 w-[7.5rem]"
              disabled={disabled || creating}
              id={fieldId("schedule-playbook-time")}
              onChange={(event) => {
                setNewTime(event.target.value);
              }}
              type="time"
              value={newTime}
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <label htmlFor={fieldId("schedule-playbook-slack")}>Post to Slack</label>
            <Switch
              checked={newSlack}
              disabled={disabled || creating}
              id={fieldId("schedule-playbook-slack")}
              onCheckedChange={setNewSlack}
            />
          </div>
          {newSlack ? (
            <Input
              disabled={disabled || creating}
              id={fieldId("schedule-playbook-slack-channel")}
              onChange={(event) => {
                setNewSlackChannel(event.target.value);
              }}
              placeholder="#alerts or channel ID"
              value={newSlackChannel}
            />
          ) : null}
          <div className="flex gap-2">
            <Button
              disabled={disabled || creating || !selectedPlaybookId}
              onClick={() => {
                void (async () => {
                  const playbook = playbooks.find((item) => item.id === selectedPlaybookId);
                  const time = parseTimeValue(newTime);
                  if (!playbook || !time) {
                    setActionError("Pick a playbook and a valid time.");
                    return;
                  }
                  setCreating(true);
                  setActionError(null);
                  try {
                    await createScheduledPlaybookApi({
                      label: playbook.label,
                      prompt: playbook.prompt,
                      sourcePlaybookId: playbook.id,
                      hour: time.hour,
                      minute: time.minute,
                      timezone: browserTimeZone(),
                      weekdaysOnly: true,
                      enabled: true,
                      slackDeliveryEnabled: newSlack,
                      slackChannel: newSlackChannel.trim() || null,
                    });
                    await refresh();
                    setAdding(false);
                    setNewSlack(false);
                    setNewSlackChannel("");
                  } catch (error) {
                    setActionError(
                      error instanceof Error ? error.message : "Unable to create schedule.",
                    );
                  } finally {
                    setCreating(false);
                  }
                })();
              }}
              size="sm"
              type="button"
            >
              {creating ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : null}
              Save
            </Button>
            <Button
              disabled={creating}
              onClick={() => {
                setAdding(false);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {schedules.length === 0 ? (
        <p className="text-muted-foreground border-border/60 border-t px-4 py-4 text-sm">
          {noPlaybooks ? (
            <>
              Save a playbook first, then come back to schedule it.{" "}
              <Link className="text-foreground underline underline-offset-2" href="/playbooks">
                Open playbooks
              </Link>
            </>
          ) : (
            "None yet — use Add to schedule one."
          )}
        </p>
      ) : (
        <ul className="border-border/60 divide-border/60 divide-y border-t">
          {schedules.map((schedule) => {
            const timeValue = formatTimeValue(schedule.hour, schedule.minute);
            const busy = busyId === schedule.id;
            return (
              <li className="flex flex-col gap-3 px-4 py-3.5" key={schedule.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{schedule.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {timeValue}
                      {schedule.weekdaysOnly ? " · weekdays" : ""}
                      {schedule.slackDeliveryEnabled ? " · Slack" : ""}
                    </p>
                    <p className="text-muted-foreground/90 mt-0.5 text-xs">
                      {formatScheduleLastRun(schedule.lastRunAt, schedule.timezone)}
                    </p>
                  </div>
                  <button
                    aria-label={`Delete ${schedule.label} schedule`}
                    className="text-muted-foreground hover:text-destructive inline-flex size-8 items-center justify-center rounded-md"
                    disabled={disabled || busy}
                    onClick={() => {
                      void (async () => {
                        setBusyId(schedule.id);
                        setActionError(null);
                        try {
                          await deleteScheduledPlaybookApi(schedule.id);
                          await refresh();
                        } catch (error) {
                          setActionError(
                            error instanceof Error ? error.message : "Unable to delete schedule.",
                          );
                        } finally {
                          setBusyId(null);
                        }
                      })();
                    }}
                    type="button"
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <label htmlFor={fieldId(`schedule-enabled-${schedule.id}`)}>On</label>
                  <Switch
                    checked={schedule.enabled}
                    disabled={disabled || busy}
                    id={fieldId(`schedule-enabled-${schedule.id}`)}
                    onCheckedChange={(enabled) => {
                      void (async () => {
                        setBusyId(schedule.id);
                        try {
                          await updateScheduledPlaybookApi(schedule.id, { enabled });
                          await refresh();
                        } catch (error) {
                          setActionError(
                            error instanceof Error ? error.message : "Unable to update schedule.",
                          );
                        } finally {
                          setBusyId(null);
                        }
                      })();
                    }}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <label htmlFor={fieldId(`schedule-time-${schedule.id}`)}>Local time</label>
                  <Input
                    className="h-8 w-[7.5rem]"
                    defaultValue={timeValue}
                    disabled={disabled || busy}
                    id={fieldId(`schedule-time-${schedule.id}`)}
                    key={`${schedule.id}-${timeValue}`}
                    onBlur={(event) => {
                      const parsed = parseTimeValue(event.target.value);
                      if (!parsed) {
                        event.target.value = timeValue;
                        return;
                      }
                      if (parsed.hour === schedule.hour && parsed.minute === schedule.minute) {
                        return;
                      }
                      void (async () => {
                        setBusyId(schedule.id);
                        try {
                          await updateScheduledPlaybookApi(schedule.id, {
                            hour: parsed.hour,
                            minute: parsed.minute,
                          });
                          await refresh();
                        } catch (error) {
                          setActionError(
                            error instanceof Error ? error.message : "Unable to update schedule.",
                          );
                        } finally {
                          setBusyId(null);
                        }
                      })();
                    }}
                    type="time"
                  />
                </div>

                {schedule.lastSlackError ? (
                  <p className="text-destructive text-xs">{schedule.lastSlackError}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={disabled || busy}
                    onClick={() => {
                      void (async () => {
                        setBusyId(schedule.id);
                        setActionError(null);
                        try {
                          const result = await runScheduledPlaybookNow(schedule.id);
                          if (result.skipped) {
                            setActionError("Schedule did not run.");
                            return;
                          }
                          if (result.slack.attempted && !result.slack.ok) {
                            setActionError(result.slack.error);
                          }
                          await refresh();
                          onOpenChat(result.chat.id);
                        } catch (error) {
                          setActionError(
                            error instanceof Error ? error.message : "Unable to run schedule.",
                          );
                        } finally {
                          setBusyId(null);
                        }
                      })();
                    }}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    {busy ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : null}
                    Run now
                  </Button>
                  {schedule.lastChatId ? (
                    <Button
                      disabled={disabled || busy}
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
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {actionError ? (
        <p className="text-destructive border-border/60 border-t px-4 py-2.5 text-xs">
          {actionError}
        </p>
      ) : null}
    </section>
  );
}
