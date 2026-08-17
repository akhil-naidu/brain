"use client";

import { useCallback, useEffect, useState } from "react";
import { FormFieldsSkeleton } from "@/components/loading/skeletons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  extraSlackInboundChannelIds,
  type SlackInboundListedChannel,
  slackInboundAllowlistSaveText,
} from "@/lib/chat/slack-inbound/channel-picker";
import { showToast } from "@/lib/ui/toast-store";
import { cn } from "@/lib/utils";

type SlackInboundSource = "stored" | "env" | "mixed";

type SlackInboundStatus = {
  readonly canManage: boolean;
  readonly hasBotToken: boolean;
  readonly hasSigningSecret: boolean;
  readonly source: SlackInboundSource | null;
  readonly eventUrl: string | null;
  readonly allowedChannelIds: readonly string[];
  readonly allowedChannelIdsSource: "stored" | "env" | null;
};

function sourceLabel(source: SlackInboundSource | null): string | null {
  if (source === "stored") {
    return "Saved on this host";
  }
  if (source === "env") {
    return "Using environment variables";
  }
  if (source === "mixed") {
    return "Using saved values and environment variables";
  }
  return null;
}

function inboundStatusCopy(status: SlackInboundStatus): {
  readonly label: string;
  readonly tone: "ready" | "warn" | "idle";
} {
  if (status.hasBotToken && status.hasSigningSecret) {
    return { label: "Inbound on", tone: "ready" };
  }
  if (status.hasBotToken || status.hasSigningSecret) {
    return { label: "Incomplete", tone: "warn" };
  }
  return { label: "Not set up", tone: "idle" };
}

function parseSlackInboundStatus(data: unknown): SlackInboundStatus | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return null;
  }
  if (!("canManage" in data) || typeof data.canManage !== "boolean") {
    return null;
  }
  if (!data.canManage) {
    return {
      canManage: false,
      hasBotToken: false,
      hasSigningSecret: false,
      source: null,
      eventUrl: null,
      allowedChannelIds: [],
      allowedChannelIdsSource: null,
    };
  }
  const source =
    "source" in data &&
    (data.source === "stored" || data.source === "env" || data.source === "mixed")
      ? data.source
      : null;
  const allowedChannelIds =
    "allowedChannelIds" in data && Array.isArray(data.allowedChannelIds)
      ? data.allowedChannelIds.filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0,
        )
      : [];
  const allowedChannelIdsSource =
    "allowedChannelIdsSource" in data &&
    (data.allowedChannelIdsSource === "stored" ||
      data.allowedChannelIdsSource === "env" ||
      data.allowedChannelIdsSource === null)
      ? data.allowedChannelIdsSource
      : null;
  return {
    canManage: true,
    hasBotToken: "hasBotToken" in data && data.hasBotToken === true,
    hasSigningSecret: "hasSigningSecret" in data && data.hasSigningSecret === true,
    source,
    eventUrl: "eventUrl" in data && typeof data.eventUrl === "string" ? data.eventUrl : null,
    allowedChannelIds,
    allowedChannelIdsSource,
  };
}

function parseListedChannels(data: unknown): SlackInboundListedChannel[] | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return null;
  }
  if (!("channels" in data) || !Array.isArray(data.channels)) {
    return null;
  }
  const rawChannels: readonly unknown[] = data.channels;
  const channels: SlackInboundListedChannel[] = [];
  for (const item of rawChannels) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return null;
    }
    if (!("id" in item) || typeof item.id !== "string" || item.id.trim().length === 0) {
      return null;
    }
    if (!("name" in item) || typeof item.name !== "string" || item.name.trim().length === 0) {
      return null;
    }
    const id = item.id;
    const name = item.name;
    channels.push({
      id,
      name,
      selected: "selected" in item && item.selected === true,
    });
  }
  return channels;
}

export function SlackInboundSettings({ autoOpen = false }: { readonly autoOpen?: boolean }) {
  const [status, setStatus] = useState<SlackInboundStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [signingSecret, setSigningSecret] = useState("");
  const [allowedChannelsText, setAllowedChannelsText] = useState("");
  const [limitMentions, setLimitMentions] = useState(false);
  const [listedChannels, setListedChannels] = useState<SlackInboundListedChannel[]>([]);
  const [channelQuery, setChannelQuery] = useState("");
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const response = await fetch("/api/slack-inbound", { cache: "no-store" });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error("Unable to load Slack inbound status.");
    }
    const parsed = parseSlackInboundStatus(data);
    if (!parsed) {
      throw new Error("Unable to load Slack inbound status.");
    }
    setStatus(parsed);
  }, []);

  useEffect(() => {
    setLoading(true);
    void (async () => {
      try {
        await load();
      } catch (error) {
        setStatus(null);
        setLoadError(error instanceof Error ? error.message : "Unable to load Slack inbound.");
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  useEffect(() => {
    if (autoOpen && status?.canManage) {
      setOpen(true);
    }
  }, [autoOpen, status?.canManage]);

  useEffect(() => {
    if (!open) {
      setBotToken("");
      setSigningSecret("");
      setFormError(null);
      setCopied(false);
      setChannelQuery("");
      setChannelsError(null);
      setListedChannels([]);
      setChannelsLoading(false);
      return undefined;
    }
    const effectiveIds = status?.allowedChannelIds ?? [];
    setLimitMentions(effectiveIds.length > 0);
    setAllowedChannelsText(effectiveIds.join("\n"));
    if (!status?.hasBotToken) {
      setChannelsLoading(false);
      setListedChannels([]);
      return undefined;
    }
    const controller = new AbortController();
    setChannelsLoading(true);
    void (async () => {
      try {
        const response = await fetch("/api/slack-inbound/channels", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data: unknown = await response.json().catch(() => null);
        if (controller.signal.aborted) {
          return;
        }
        if (!response.ok) {
          const error =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Could not list Slack channels.";
          throw new Error(error);
        }
        const channels = parseListedChannels(data);
        if (!channels) {
          throw new Error("Could not list Slack channels.");
        }
        setListedChannels(channels);
        setAllowedChannelsText(
          extraSlackInboundChannelIds(
            effectiveIds,
            channels.map((channel) => channel.id),
          ).join("\n"),
        );
        setChannelsError(null);
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return;
        }
        setListedChannels([]);
        setAllowedChannelsText(effectiveIds.join("\n"));
        setChannelsError(error instanceof Error ? error.message : "Could not list Slack channels.");
      } finally {
        if (!controller.signal.aborted) {
          setChannelsLoading(false);
        }
      }
    })();
    return () => {
      controller.abort();
    };
  }, [open, status?.allowedChannelIds, status?.hasBotToken]);

  if (loading && !status) {
    return null;
  }

  if (loadError) {
    return (
      <div className="border-border/60 mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
        <p className="text-destructive text-xs" role="alert">
          {loadError}
        </p>
        <Button
          onClick={() => {
            setLoading(true);
            void (async () => {
              try {
                await load();
              } catch (error) {
                setLoadError(
                  error instanceof Error ? error.message : "Unable to load Slack inbound.",
                );
              } finally {
                setLoading(false);
              }
            })();
          }}
          size="xs"
          type="button"
          variant="outline"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!status?.canManage) {
    return null;
  }

  const ready = status.hasBotToken && status.hasSigningSecret;
  const statusCopy = inboundStatusCopy(status);
  const hasStored = status.source === "stored" || status.source === "mixed";
  const selectedIds = listedChannels
    .filter((channel) => channel.selected)
    .map((channel) => channel.id);
  const selectedSaved = listedChannels
    .filter((channel) =>
      status.allowedChannelIds.some(
        (id) => id.trim().toUpperCase() === channel.id.trim().toUpperCase(),
      ),
    )
    .map((channel) => channel.id.trim().toUpperCase())
    .toSorted()
    .join("\n");
  const selectedNow = selectedIds
    .map((id) => id.trim().toUpperCase())
    .toSorted()
    .join("\n");
  const extraSaved = extraSlackInboundChannelIds(
    status.allowedChannelIds,
    listedChannels.map((channel) => channel.id),
  ).join("\n");
  const limitMentionsChanged = limitMentions !== status.allowedChannelIds.length > 0;
  const channelsChanged =
    limitMentionsChanged || selectedNow !== selectedSaved || allowedChannelsText !== extraSaved;
  const canSave =
    Boolean(botToken.trim() || signingSecret.trim() || channelsChanged) && !saving && !clearing;
  const visibleChannels = listedChannels.filter((channel) => {
    const query = channelQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return channel.name.toLowerCase().includes(query) || channel.id.toLowerCase().includes(query);
  });

  const save = () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    setFormError(null);
    void (async () => {
      try {
        const allowlist = slackInboundAllowlistSaveText({
          limitMentions,
          selectedIds,
          extraText: allowedChannelsText,
        });
        if (!allowlist.ok) {
          throw new Error(allowlist.error);
        }
        const response = await fetch("/api/slack-inbound", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...(botToken.trim() ? { botToken: botToken.trim() } : {}),
            ...(signingSecret.trim() ? { signingSecret: signingSecret.trim() } : {}),
            allowedChannelsText: allowlist.allowedChannelsText,
            limitMentions,
          }),
        });
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const error =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Unable to save Slack inbound credentials.";
          throw new Error(error);
        }
        setBotToken("");
        setSigningSecret("");
        await load();
        setOpen(false);
        showToast({
          title: "Saved",
          message:
            botToken.trim() || signingSecret.trim()
              ? "Slack can now deliver DMs and mentions to Brain."
              : "Allowed Slack channels were saved.",
          variant: "success",
        });
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Unable to save Slack inbound credentials.",
        );
      } finally {
        setSaving(false);
      }
    })();
  };

  const clearStored = () => {
    setClearing(true);
    setFormError(null);
    void (async () => {
      try {
        const response = await fetch("/api/slack-inbound", { method: "DELETE" });
        if (!response.ok) {
          throw new Error("Unable to clear stored Slack inbound credentials.");
        }
        await load();
        showToast({
          title: "Removed",
          message: "Saved inbound credentials were cleared. Environment variables still apply.",
          variant: "success",
        });
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Unable to clear credentials.");
      } finally {
        setClearing(false);
      }
    })();
  };

  const copyEventUrl = () => {
    if (!status.eventUrl) {
      return;
    }
    void (async () => {
      try {
        await navigator.clipboard.writeText(status.eventUrl ?? "");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } catch {
        setFormError("Couldn't copy the Event URL.");
      }
    })();
  };

  return (
    <>
      <div className="border-border/60 mt-4 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">DMs and @mentions</p>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                statusCopy.tone === "ready"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : statusCopy.tone === "warn"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {statusCopy.label}
            </span>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Let people talk to Brain in Slack. Uses a bot token, not Slack Connect.
            {status.allowedChannelIds.length > 0
              ? ` Limited to ${status.allowedChannelIds.length} ${
                  status.allowedChannelIds.length === 1 ? "channel" : "channels"
                }.`
              : ""}
          </p>
        </div>
        <Button
          onClick={() => {
            setOpen(true);
          }}
          size="sm"
          type="button"
          variant={ready ? "outline" : "default"}
        >
          {ready ? "Inbound settings" : "Set up inbound"}
        </Button>
      </div>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="max-h-[min(90vh,44rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Slack inbound</DialogTitle>
            <DialogDescription>
              Bot token and signing secret for DMs, @mentions, and approval buttons. Optionally
              limit mentions to channels the bot can see. This is separate from Slack Connect, which
              is for tools.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <FormFieldsSkeleton fields={3} />
          ) : (
            <div className="flex flex-col gap-3">
              {status.eventUrl ? (
                <div className="bg-muted/40 rounded-md px-3 py-2">
                  <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                    Event URL
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Paste this as the Event Subscriptions and Interactivity Request URL in your
                    Slack app.
                  </p>
                  <p className="text-foreground mt-1 font-mono text-xs break-all">
                    {status.eventUrl}
                  </p>
                  <Button
                    className="mt-2"
                    onClick={copyEventUrl}
                    size="xs"
                    type="button"
                    variant="outline"
                  >
                    {copied ? "Copied" : "Copy URL"}
                  </Button>
                </div>
              ) : null}

              <Field>
                <FieldLabel htmlFor="slack-inbound-bot-token">Bot token</FieldLabel>
                <Input
                  autoComplete="off"
                  id="slack-inbound-bot-token"
                  onChange={(event) => {
                    setBotToken(event.target.value);
                  }}
                  placeholder={
                    status.hasBotToken ? "Leave blank to keep the current token" : "xoxb-…"
                  }
                  spellCheck={false}
                  type="password"
                  value={botToken}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="slack-inbound-signing-secret">Signing secret</FieldLabel>
                <Input
                  autoComplete="off"
                  id="slack-inbound-signing-secret"
                  onChange={(event) => {
                    setSigningSecret(event.target.value);
                  }}
                  placeholder={
                    status.hasSigningSecret
                      ? "Leave blank to keep the current secret"
                      : "From Slack app Basic Information"
                  }
                  spellCheck={false}
                  type="password"
                  value={signingSecret}
                />
              </Field>
              <div className="border-border/70 flex items-center justify-between gap-4 rounded-xl border px-3 py-2.5">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Limit @mentions to selected channels</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Off means every channel the bot can see, even if env is set. DMs always work.
                  </p>
                </div>
                <Switch
                  aria-label="Limit @mentions to selected channels"
                  checked={limitMentions}
                  onCheckedChange={setLimitMentions}
                />
              </div>
              {limitMentions ? (
                <div className="flex flex-col gap-3">
                  {!status.hasBotToken ? (
                    <p className="text-muted-foreground text-xs">
                      Save a bot token to load Slack channels. You can still paste C… / G… ids.
                    </p>
                  ) : null}
                  {channelsError ? (
                    <p className="text-destructive text-xs" role="alert">
                      {channelsError}
                    </p>
                  ) : null}
                  {status.hasBotToken && !channelsError ? (
                    <>
                      <Field>
                        <FieldLabel htmlFor="slack-inbound-channel-search">
                          Filter channels
                        </FieldLabel>
                        <Input
                          id="slack-inbound-channel-search"
                          onChange={(event) => {
                            setChannelQuery(event.target.value);
                          }}
                          placeholder="Search by name or id"
                          value={channelQuery}
                        />
                      </Field>
                      <div className="border-border/70 max-h-48 overflow-y-auto rounded-lg border px-2 py-1">
                        {channelsLoading ? (
                          <p className="text-muted-foreground px-1 py-2 text-xs">
                            Loading channels…
                          </p>
                        ) : listedChannels.length === 0 ? (
                          <p className="text-muted-foreground px-1 py-2 text-xs">
                            No channels listed. Invite the bot or paste a channel id below.
                          </p>
                        ) : visibleChannels.length === 0 ? (
                          <p className="text-muted-foreground px-1 py-2 text-xs">
                            No matching channels.
                          </p>
                        ) : (
                          visibleChannels.map((channel) => (
                            <label
                              aria-label={`#${channel.name} ${channel.id}`}
                              className="hover:bg-muted/40 flex cursor-pointer items-start gap-2 rounded-md px-1 py-1.5"
                              htmlFor={`slack-inbound-channel-${channel.id}`}
                              key={channel.id}
                            >
                              <input
                                checked={channel.selected}
                                className="mt-1"
                                id={`slack-inbound-channel-${channel.id}`}
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  setListedChannels((current) =>
                                    current.map((entry) =>
                                      entry.id === channel.id
                                        ? { ...entry, selected: checked }
                                        : entry,
                                    ),
                                  );
                                }}
                                type="checkbox"
                              />
                              <span className="min-w-0">
                                <span className="block text-sm">#{channel.name}</span>
                                <span className="text-muted-foreground block font-mono text-[11px]">
                                  {channel.id}
                                </span>
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </>
                  ) : null}
                  <Field>
                    <FieldLabel htmlFor="slack-inbound-allowed-channels">
                      {status.hasBotToken && !channelsError ? "Extra channel ids" : "Channel ids"}
                    </FieldLabel>
                    <Textarea
                      id="slack-inbound-allowed-channels"
                      onChange={(event) => {
                        setAllowedChannelsText(event.target.value);
                      }}
                      placeholder={"Ids Slack did not list\nC0123ABCDE"}
                      spellCheck={false}
                      value={allowedChannelsText}
                    />
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Optional C… / G… ids or #names for channels the list missed. Invite the bot or
                      paste the id.
                      {status.allowedChannelIdsSource === "env"
                        ? " These ids currently come from SLACK_INBOUND_CHANNEL_IDS."
                        : ""}
                    </p>
                  </Field>
                </div>
              ) : null}
              {sourceLabel(status.source) ? (
                <p className="text-muted-foreground text-xs">{sourceLabel(status.source)}.</p>
              ) : null}
              {formError ? (
                <p className="text-destructive text-sm" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
          )}

          <DialogFooter>
            {hasStored ? (
              <Button
                disabled={clearing || saving}
                onClick={clearStored}
                type="button"
                variant="ghost"
              >
                {clearing ? "Removing…" : "Remove saved"}
              </Button>
            ) : null}
            <Button onClick={() => setOpen(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={!canSave} onClick={save} type="button">
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
