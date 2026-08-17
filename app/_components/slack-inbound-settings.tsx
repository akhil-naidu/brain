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
import { Textarea } from "@/components/ui/textarea";
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

export function SlackInboundSettings({ autoOpen = false }: { readonly autoOpen?: boolean }) {
  const [status, setStatus] = useState<SlackInboundStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [signingSecret, setSigningSecret] = useState("");
  const [allowedChannelsText, setAllowedChannelsText] = useState("");
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
      return;
    }
    setAllowedChannelsText((status?.allowedChannelIds ?? []).join("\n"));
  }, [open, status?.allowedChannelIds]);

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
  const savedChannelsText = status.allowedChannelIds.join("\n");
  const channelsChanged = allowedChannelsText !== savedChannelsText;
  const canSave =
    Boolean(botToken.trim() || signingSecret.trim() || channelsChanged) && !saving && !clearing;

  const save = () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    setFormError(null);
    void (async () => {
      try {
        const response = await fetch("/api/slack-inbound", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...(botToken.trim() ? { botToken: botToken.trim() } : {}),
            ...(signingSecret.trim() ? { signingSecret: signingSecret.trim() } : {}),
            allowedChannelsText,
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Slack inbound</DialogTitle>
            <DialogDescription>
              Bot token and signing secret for DMs, @mentions, and approval buttons. Optionally
              limit mentions to specific channels. This is separate from Slack Connect, which is for
              tools.
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
              <Field>
                <FieldLabel htmlFor="slack-inbound-allowed-channels">Allowed channels</FieldLabel>
                <Textarea
                  id="slack-inbound-allowed-channels"
                  onChange={(event) => {
                    setAllowedChannelsText(event.target.value);
                  }}
                  placeholder={
                    "Leave blank for every channel the bot can see.\nC0123ABCDE\n#engineering"
                  }
                  spellCheck={false}
                  value={allowedChannelsText}
                />
                <p className="text-muted-foreground text-xs leading-relaxed">
                  One C… / G… id or #name per line. DMs always work. Mentions outside this list are
                  ignored. Saving an empty box means every channel, even if env is set.
                  {status.allowedChannelIdsSource === "env"
                    ? " These ids currently come from SLACK_INBOUND_CHANNEL_IDS."
                    : ""}
                </p>
              </Field>
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
