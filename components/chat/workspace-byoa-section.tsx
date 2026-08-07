"use client";

import { useCallback, useEffect, useState } from "react";
import { FormFieldsSkeleton } from "@/components/loading/skeletons";
import { SettingsPanel, SettingsSection } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load setup.");
      setInfo(null);
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
        clientSecret: info.requiresClientSecret ? clientSecret : undefined,
      });
      setClientId("");
      setClientSecret("");
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
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs">Redirect URI</p>
        <div className="flex gap-2">
          <code className="bg-muted/40 flex-1 truncate rounded px-2 py-1 font-mono text-xs">
            {info.callbackUrl}
          </code>
          <Button
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
            size="sm"
            type="button"
            variant="outline"
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      {info.canManageCredentials ? (
        <>
          <Field>
            <FieldLabel htmlFor={`byoa-${connectionId}-id`}>Client ID</FieldLabel>
            <Input
              id={`byoa-${connectionId}-id`}
              onChange={(event) => setClientId(event.target.value)}
              placeholder="Workspace OAuth client id"
              value={clientId}
            />
          </Field>
          {info.requiresClientSecret ? (
            <Field>
              <FieldLabel htmlFor={`byoa-${connectionId}-secret`}>Client secret</FieldLabel>
              <Input
                id={`byoa-${connectionId}-secret`}
                onChange={(event) => setClientSecret(event.target.value)}
                placeholder="Workspace OAuth client secret"
                type="password"
                value={clientSecret}
              />
            </Field>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending || !clientId.trim()}
              onClick={() => {
                void onSave();
              }}
              size="sm"
              type="button"
            >
              {pending ? "Saving…" : "Save workspace app"}
            </Button>
            {info.hasWorkspaceCredentials ? (
              <Button
                disabled={pending}
                onClick={() => {
                  void onClear();
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                Clear override
              </Button>
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
