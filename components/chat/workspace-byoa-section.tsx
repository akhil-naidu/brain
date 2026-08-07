"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckIcon, CopyIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { FormFieldsSkeleton } from "@/components/loading/skeletons";
import { SettingsPanel, SettingsSection } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IconTooltip } from "@/components/ui/tooltip";
import { STATIC_APP_CREDENTIAL_CONNECTION_IDS } from "@/lib/chat/connection-catalog";
import {
  clearWorkspaceConnectionSetup,
  fetchWorkspaceConnectionSetup,
  saveWorkspaceConnectionSetup,
  type ConnectionSetupInfo,
} from "@/lib/chat/connections-status-api";

function sourceLabel(source: ConnectionSetupInfo["credentialSource"]): string {
  if (source === "workspace") {
    return "Using workspace app";
  }
  if (source === "stored") {
    return "Using host app";
  }
  if (source === "env") {
    return "Using env app";
  }
  return "No app credentials";
}

function ByoaProviderCard({ connectionId }: { readonly connectionId: string }) {
  const [info, setInfo] = useState<ConnectionSetupInfo | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const setup = await fetchWorkspaceConnectionSetup(connectionId);
      setInfo(setup);
      setClientId(setup.storedClientId?.trim() ?? "");
      setClientSecret("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load setup.");
      setInfo(null);
      setClientId("");
      setClientSecret("");
    }
  }, [connectionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSave() {
    if (!info?.canManageCredentials) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await saveWorkspaceConnectionSetup(connectionId, {
        clientId,
        clientSecret: info.requiresClientSecret ? clientSecret || undefined : undefined,
      });
      setPending(false);
      await refresh();
    } catch (saveError) {
      setPending(false);
      setError(saveError instanceof Error ? saveError.message : "Unable to save.");
    }
  }

  async function onClear() {
    if (!info?.canManageCredentials) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await clearWorkspaceConnectionSetup(connectionId);
      setPending(false);
      await refresh();
    } catch (clearError) {
      setPending(false);
      setError(clearError instanceof Error ? clearError.message : "Unable to clear.");
    }
  }

  if (!info && !error) {
    return (
      <SettingsPanel className="p-4">
        <FormFieldsSkeleton fields={2} />
      </SettingsPanel>
    );
  }

  if (!info) {
    return (
      <SettingsPanel className="p-4">
        <p className="text-destructive text-sm">{error}</p>
      </SettingsPanel>
    );
  }

  return (
    <SettingsPanel className="space-y-3 p-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium capitalize">{info.displayName}</p>
        <p className="text-muted-foreground text-xs">
          {sourceLabel(info.credentialSource)}
          {info.hasWorkspaceCredentials ? " · workspace override saved" : ""}
        </p>
      </div>
      <div className="border-border/70 bg-muted/25 rounded-xl border px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Redirect URI
            </p>
            <code className="text-foreground mt-1 block font-mono text-xs break-all">
              {info.callbackUrl}
            </code>
          </div>
          <IconTooltip label={copied ? "Copied" : "Copy redirect URI"} side="left">
            <Button
              aria-label={copied ? "Copied" : "Copy redirect URI"}
              disabled={pending}
              onClick={() => {
                void (async () => {
                  try {
                    await navigator.clipboard.writeText(info.callbackUrl);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  } catch {
                    setCopied(false);
                  }
                })();
              }}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
            </Button>
          </IconTooltip>
        </div>
      </div>
      {info.canManageCredentials ? (
        <>
          <Field>
            <FieldLabel htmlFor={`byoa-${connectionId}-id`}>App ID</FieldLabel>
            <Input
              id={`byoa-${connectionId}-id`}
              onChange={(event) => setClientId(event.target.value)}
              placeholder="OAuth client / app id"
              value={clientId}
            />
          </Field>
          {info.requiresClientSecret ? (
            <Field>
              <FieldLabel htmlFor={`byoa-${connectionId}-secret`}>App secret</FieldLabel>
              <Input
                id={`byoa-${connectionId}-secret`}
                onChange={(event) => setClientSecret(event.target.value)}
                placeholder={
                  info.hasWorkspaceCredentials
                    ? "Leave blank to keep current secret"
                    : "OAuth client secret"
                }
                type="password"
                value={clientSecret}
              />
              {info.hasWorkspaceCredentials ? (
                <FieldDescription>
                  Secret is never shown after save. Enter a new value only to replace it.
                </FieldDescription>
              ) : null}
            </Field>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={
                pending ||
                !clientId.trim() ||
                (info.requiresClientSecret && !clientSecret.trim() && !info.hasWorkspaceCredentials)
              }
              onClick={() => {
                void onSave();
              }}
              size="sm"
              type="button"
            >
              <SaveIcon className="size-3.5" />
              {pending ? "Saving…" : info.hasWorkspaceCredentials ? "Save changes" : "Save app"}
            </Button>
            {info.hasWorkspaceCredentials ? (
              <IconTooltip label="Remove workspace app" side="top">
                <Button
                  aria-label="Remove workspace app"
                  disabled={pending}
                  onClick={() => {
                    void onClear();
                  }}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2Icon />
                </Button>
              </IconTooltip>
            ) : null}
          </div>
        </>
      ) : (
        <p className="text-muted-foreground text-xs">
          Only workspace owners and admins can change workspace app credentials.
        </p>
      )}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </SettingsPanel>
  );
}

export function WorkspaceByoaSection() {
  return (
    <SettingsSection
      description="Optional BYOA overrides for this workspace. When set, Connect uses these apps instead of the host/env apps. ClickUp and dFlow use dynamic registration and do not need this."
      title="Workspace apps"
    >
      <div className="grid gap-3">
        {STATIC_APP_CREDENTIAL_CONNECTION_IDS.map((id) => (
          <ByoaProviderCard connectionId={id} key={id} />
        ))}
      </div>
    </SettingsSection>
  );
}
