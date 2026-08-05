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
    setInfo(null);
    setCopied(false);

    void (async () => {
      try {
        const setup = await fetchConnectionSetup(connectionId);
        if (!cancelled) {
          setInfo(setup);
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
        });
        onSaved();
        onOpenChange(false);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Unable to save credentials.");
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
      } catch (clearError) {
        setError(
          clearError instanceof Error ? clearError.message : "Unable to clear stored credentials.",
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
        setError("Couldn't copy redirect URI.");
      }
    })();
  };

  const canSave =
    clientId.trim().length > 0 &&
    (!info?.requiresClientSecret || clientSecret.trim().length > 0) &&
    !saving &&
    !loading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {info ? `Configure ${info.displayName}` : "Configure connection"}
          </DialogTitle>
          <DialogDescription>
            Paste the OAuth app client ID and secret from the provider console. Credentials stay on
            this Brain host under <code className="text-xs">.eve/</code> — no redeploy needed.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <div className="flex flex-col gap-3">
            {info ? (
              <div className="bg-muted/40 rounded-md px-3 py-2">
                <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  Redirect URI
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
                  {copied ? "Copied" : "Copy URI"}
                </Button>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <label
                className="text-foreground text-sm font-medium"
                htmlFor="connection-setup-client-id"
              >
                Client ID
              </label>
              <Input
                autoComplete="off"
                id="connection-setup-client-id"
                onChange={(event) => setClientId(event.target.value)}
                placeholder={info?.clientIdEnv ?? "Client ID"}
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
                  Client secret
                </label>
                <Input
                  autoComplete="off"
                  id="connection-setup-client-secret"
                  onChange={(event) => setClientSecret(event.target.value)}
                  placeholder={info.clientSecretEnv ?? "Client secret"}
                  spellCheck={false}
                  type="password"
                  value={clientSecret}
                />
              </div>
            ) : null}

            {info?.hasStoredCredentials ? (
              <p className="text-muted-foreground text-xs">
                Stored credentials are already on this host. Saving replaces them.
              </p>
            ) : info?.credentialSource === "env" ? (
              <p className="text-muted-foreground text-xs">
                Credentials are currently loaded from the environment. Saving stores a local copy
                that takes priority.
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
              {clearing ? "Clearing…" : "Clear stored"}
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
