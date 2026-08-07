"use client";

import { useEffect, useState } from "react";
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
import {
  connectionSetupCanManageBoth,
  resolveConnectionSetupTarget,
  type ConnectionSetupTarget,
} from "@/lib/chat/connection-setup-target";
import {
  clearConnectionSetup,
  clearWorkspaceConnectionSetup,
  fetchConnectionSetup,
  fetchWorkspaceConnectionSetup,
  saveConnectionSetup,
  saveWorkspaceConnectionSetup,
  type ConnectionSetupInfo,
} from "@/lib/chat/connections-status-api";
import { cn } from "@/lib/utils";

type LoadedSetup = {
  readonly workspace: ConnectionSetupInfo | null;
  readonly host: ConnectionSetupInfo | null;
  readonly target: ConnectionSetupTarget;
};

async function loadSetup(connectionId: string): Promise<LoadedSetup> {
  const [workspaceResult, hostResult] = await Promise.allSettled([
    fetchWorkspaceConnectionSetup(connectionId),
    fetchConnectionSetup(connectionId),
  ]);

  const workspace = workspaceResult.status === "fulfilled" ? workspaceResult.value : null;
  const host = hostResult.status === "fulfilled" ? hostResult.value : null;

  if (!workspace && !host) {
    const workspaceError =
      workspaceResult.status === "rejected" && workspaceResult.reason instanceof Error
        ? workspaceResult.reason.message
        : null;
    const hostError =
      hostResult.status === "rejected" && hostResult.reason instanceof Error
        ? hostResult.reason.message
        : null;
    throw new Error(workspaceError ?? hostError ?? "Unable to load setup.");
  }

  return {
    workspace,
    host,
    target: resolveConnectionSetupTarget({
      workspaceCanManage: workspace?.canManageCredentials,
      hostCanManage: host?.canManageCredentials,
    }),
  };
}

function infoForTarget(
  loaded: Pick<LoadedSetup, "workspace" | "host">,
  target: ConnectionSetupTarget,
): ConnectionSetupInfo | null {
  if (target === "workspace") {
    return loaded.workspace ?? loaded.host;
  }
  if (target === "host") {
    return loaded.host ?? loaded.workspace;
  }
  return loaded.workspace ?? loaded.host;
}

export function ConnectionSetupDialog({
  connectionId,
  open,
  onOpenChange,
  onSaved,
}: {
  readonly connectionId: string | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSaved: () => void;
}) {
  const [workspaceInfo, setWorkspaceInfo] = useState<ConnectionSetupInfo | null>(null);
  const [hostInfo, setHostInfo] = useState<ConnectionSetupInfo | null>(null);
  const [target, setTarget] = useState<ConnectionSetupTarget>("none");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !connectionId) {
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setClientId("");
    setClientSecret("");
    setWorkspaceInfo(null);
    setHostInfo(null);
    setTarget("none");
    setCopied(false);

    void (async () => {
      try {
        const loaded = await loadSetup(connectionId);
        if (!cancelled) {
          setWorkspaceInfo(loaded.workspace);
          setHostInfo(loaded.host);
          setTarget(loaded.target);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load setup.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [connectionId, open]);

  const info = infoForTarget({ workspace: workspaceInfo, host: hostInfo }, target);
  const canManageBoth = connectionSetupCanManageBoth({
    workspaceCanManage: workspaceInfo?.canManageCredentials,
    hostCanManage: hostInfo?.canManageCredentials,
  });
  const canManage = target === "workspace" || target === "host";
  const hasRemovableCredentials =
    target === "workspace"
      ? Boolean(info?.hasWorkspaceCredentials)
      : Boolean(info?.hasStoredCredentials);

  const save = () => {
    if (!connectionId || !canManage) {
      return;
    }
    setSaving(true);
    setError(null);
    void (async () => {
      try {
        const payload = {
          clientId,
          clientSecret: info?.requiresClientSecret ? clientSecret : undefined,
        };
        if (target === "workspace") {
          await saveWorkspaceConnectionSetup(connectionId, payload);
        } else {
          await saveConnectionSetup(connectionId, payload);
        }
        onSaved();
        onOpenChange(false);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Unable to save.");
      } finally {
        setSaving(false);
      }
    })();
  };

  const clearStored = () => {
    if (!connectionId || !canManage) {
      return;
    }
    setClearing(true);
    setError(null);
    void (async () => {
      try {
        if (target === "workspace") {
          await clearWorkspaceConnectionSetup(connectionId);
        } else {
          await clearConnectionSetup(connectionId);
        }
        onSaved();
        const loaded = await loadSetup(connectionId);
        setWorkspaceInfo(loaded.workspace);
        setHostInfo(loaded.host);
        setTarget(target === "host" && loaded.host?.canManageCredentials ? "host" : loaded.target);
        setClientId("");
        setClientSecret("");
      } catch (clearError) {
        setError(
          clearError instanceof Error ? clearError.message : "Unable to remove saved details.",
        );
      } finally {
        setClearing(false);
      }
    })();
  };

  const copyCallback = () => {
    if (!info) {
      return;
    }
    void (async () => {
      try {
        await navigator.clipboard.writeText(info.callbackUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } catch {
        setError("Couldn't copy the return link.");
      }
    })();
  };

  const canSave =
    canManage &&
    clientId.trim().length > 0 &&
    (!info?.requiresClientSecret || clientSecret.trim().length > 0) &&
    !saving &&
    !loading;

  const appName = info?.displayName ?? "this app";
  const description =
    target === "workspace"
      ? `Enter the app ID and secret from your ${appName} account settings for this workspace. You can change these anytime. If already connected, Disconnect and Connect again after changing the app.`
      : target === "host"
        ? `Enter the app ID and secret from your ${appName} account settings for this Brain host. You can change these anytime. If already connected, Disconnect and Connect again after changing the app.`
        : `A workspace owner/admin can save ${appName} credentials for this workspace (Tools → Workspace apps), or the host operator can configure host-wide credentials. You can still copy the return link below.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{info ? `Set up ${info.displayName}` : "Set up connection"}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <FormFieldsSkeleton fields={2} />
        ) : (
          <div className="flex flex-col gap-3">
            {canManageBoth ? (
              <div className="bg-muted/40 flex rounded-md p-1">
                <button
                  className={cn(
                    "flex-1 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors",
                    target === "workspace"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => {
                    setTarget("workspace");
                    setClientId("");
                    setClientSecret("");
                    setError(null);
                  }}
                  type="button"
                >
                  This workspace
                </button>
                <button
                  className={cn(
                    "flex-1 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors",
                    target === "host"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => {
                    setTarget("host");
                    setClientId("");
                    setClientSecret("");
                    setError(null);
                  }}
                  type="button"
                >
                  Entire host
                </button>
              </div>
            ) : null}

            {info ? (
              <div className="bg-muted/40 rounded-md px-3 py-2">
                <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  Return link
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Add this link in your {info.displayName} app settings, then continue.
                </p>
                <p className="text-foreground mt-1 font-mono text-xs break-all">
                  {info.callbackUrl}
                </p>
                <Button
                  className="mt-2"
                  onClick={copyCallback}
                  size="xs"
                  type="button"
                  variant="outline"
                >
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
            ) : null}

            {!canManage && info ? (
              <output className="text-muted-foreground text-sm">
                You can&apos;t save app credentials with your current role.
                {info.hasCredentials
                  ? " Credentials are already configured — use Connect after setup is complete."
                  : " Ask a workspace owner/admin, or the host operator."}
              </output>
            ) : null}

            {canManage ? (
              <>
                <Field>
                  <FieldLabel htmlFor="connection-setup-client-id">App ID</FieldLabel>
                  <Input
                    autoComplete="off"
                    id="connection-setup-client-id"
                    onChange={(event) => setClientId(event.target.value)}
                    placeholder="Paste app ID"
                    spellCheck={false}
                    value={clientId}
                  />
                </Field>

                {info?.requiresClientSecret ? (
                  <Field>
                    <FieldLabel htmlFor="connection-setup-client-secret">App secret</FieldLabel>
                    <Input
                      autoComplete="off"
                      id="connection-setup-client-secret"
                      onChange={(event) => setClientSecret(event.target.value)}
                      placeholder="Paste app secret"
                      spellCheck={false}
                      type="password"
                      value={clientSecret}
                    />
                  </Field>
                ) : null}

                {hasRemovableCredentials ? (
                  <p className="text-muted-foreground text-xs">
                    Details are already saved
                    {target === "workspace" ? " for this workspace" : " on this host"}. Saving
                    replaces them.
                  </p>
                ) : null}
              </>
            ) : null}

            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {canManage && hasRemovableCredentials ? (
            <Button
              disabled={clearing || saving}
              onClick={clearStored}
              type="button"
              variant="ghost"
            >
              {clearing ? "Removing…" : "Remove saved"}
            </Button>
          ) : null}
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            {canManage ? "Cancel" : "Close"}
          </Button>
          {canManage ? (
            <Button disabled={!canSave} onClick={save} type="button">
              {saving ? "Saving…" : target === "workspace" ? "Save for workspace" : "Save for host"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
