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
import {
  clearConnectionSetup,
  fetchConnectionSetup,
  saveConnectionSetup,
  type ConnectionSetupInfo,
} from "@/lib/chat/connections-status-api";

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
  const [info, setInfo] = useState<ConnectionSetupInfo | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [mcpUrl, setMcpUrl] = useState("");
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
    setMcpUrl("");
    setInfo(null);
    setCopied(false);

    void (async () => {
      try {
        const setup = await fetchConnectionSetup(connectionId);
        if (!cancelled) {
          setInfo(setup);
          if (setup.mcpUrl) {
            setMcpUrl(setup.mcpUrl);
          }
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

  const save = () => {
    if (!connectionId) {
      return;
    }
    setSaving(true);
    setError(null);
    void (async () => {
      try {
        await saveConnectionSetup(connectionId, {
          clientId,
          clientSecret: info?.requiresClientSecret ? clientSecret : undefined,
          mcpUrl: info?.requiresMcpUrl ? mcpUrl : undefined,
        });
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
    if (!connectionId) {
      return;
    }
    setClearing(true);
    setError(null);
    void (async () => {
      try {
        await clearConnectionSetup(connectionId);
        onSaved();
        const setup = await fetchConnectionSetup(connectionId);
        setInfo(setup);
        setClientId("");
        setClientSecret("");
        setMcpUrl(setup.mcpUrl ?? "");
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
    clientId.trim().length > 0 &&
    (!info?.requiresClientSecret || clientSecret.trim().length > 0) &&
    (!info?.requiresMcpUrl || mcpUrl.trim().length > 0) &&
    !saving &&
    !loading;

  const appName = info?.displayName ?? "this app";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{info ? `Set up ${info.displayName}` : "Set up connection"}</DialogTitle>
          <DialogDescription>
            {info?.requiresMcpUrl
              ? `Enter the MCP server URL plus the OAuth app ID and secret from your ${appName} account. They stay on this computer.`
              : `Enter the app ID and secret from your ${appName} account settings so Brain can connect. They stay on this computer.`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <div className="flex flex-col gap-3">
            {info ? (
              <div className="bg-muted/40 rounded-md px-3 py-2">
                <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  Return link
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Add this link in your {info.displayName} OAuth app / security integration, then
                  continue.
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

            {info?.requiresMcpUrl ? (
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-foreground text-sm font-medium"
                  htmlFor="connection-setup-mcp-url"
                >
                  MCP server URL
                </label>
                <Input
                  autoComplete="off"
                  id="connection-setup-mcp-url"
                  onChange={(event) => setMcpUrl(event.target.value)}
                  placeholder="https://…/mcp-servers/…"
                  spellCheck={false}
                  value={mcpUrl}
                />
                <p className="text-muted-foreground text-xs">
                  Restart Brain after saving if tools still use an old URL.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <label
                className="text-foreground text-sm font-medium"
                htmlFor="connection-setup-client-id"
              >
                App ID
              </label>
              <Input
                autoComplete="off"
                id="connection-setup-client-id"
                onChange={(event) => setClientId(event.target.value)}
                placeholder="Paste app ID"
                spellCheck={false}
                value={clientId}
              />
            </div>

            {info?.requiresClientSecret ? (
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-foreground text-sm font-medium"
                  htmlFor="connection-setup-client-secret"
                >
                  App secret
                </label>
                <Input
                  autoComplete="off"
                  id="connection-setup-client-secret"
                  onChange={(event) => setClientSecret(event.target.value)}
                  placeholder="Paste app secret"
                  spellCheck={false}
                  type="password"
                  value={clientSecret}
                />
              </div>
            ) : null}

            {info?.hasStoredCredentials ? (
              <p className="text-muted-foreground text-xs">
                Details are already saved here. Saving replaces them.
              </p>
            ) : null}

            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {info?.hasStoredCredentials ? (
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
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={save} type="button">
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
