"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type ScimStatus = {
  readonly enabled: boolean;
  readonly canManage: boolean;
  readonly ssoLicensed: boolean;
  readonly providerId: string | null;
  readonly baseUrl: string | null;
  readonly connected: boolean;
};

export function WorkspaceScimSection(props: {
  readonly enabled: boolean;
  readonly canManage: boolean;
}) {
  const [status, setStatus] = useState<ScimStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!props.enabled) {
      return;
    }
    try {
      const response = await fetch("/api/workspaces/scim");
      const data: unknown = await response.json();
      if (!response.ok || typeof data !== "object" || data === null) {
        setError("Unable to load SCIM settings.");
        return;
      }
      setStatus({
        enabled: "enabled" in data && Boolean(data.enabled),
        canManage: "canManage" in data && Boolean(data.canManage),
        ssoLicensed: "ssoLicensed" in data && Boolean(data.ssoLicensed),
        providerId:
          "providerId" in data && typeof data.providerId === "string" ? data.providerId : null,
        baseUrl: "baseUrl" in data && typeof data.baseUrl === "string" ? data.baseUrl : null,
        connected: "connected" in data && Boolean(data.connected),
      });
      setError(null);
    } catch {
      setError("Unable to load SCIM settings.");
    }
  }, [props.enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: "generate" | "revoke") {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces/scim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "SCIM request failed.",
        );
        setPending(false);
        return;
      }
      if (
        action === "generate" &&
        typeof data === "object" &&
        data !== null &&
        "scimToken" in data &&
        typeof data.scimToken === "string"
      ) {
        setToken(data.scimToken);
      } else {
        setToken(null);
      }
      await load();
      setPending(false);
    } catch {
      setPending(false);
      setError("SCIM request failed.");
    }
  }

  if (!props.enabled) {
    return null;
  }

  const canManage = props.canManage && Boolean(status?.canManage);

  return (
    <section className="border-border/60 space-y-3 border-t pt-6">
      <div>
        <h2 className="text-sm font-medium">SCIM provisioning</h2>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Let your identity provider create and remove workspace members via SCIM 2.0. Requires the
          SSO license entitlement. Paste the base URL and bearer token into Okta, Entra, or similar.
        </p>
      </div>

      {!status?.ssoLicensed ? (
        <p className="text-muted-foreground text-xs">SCIM is locked by the current license.</p>
      ) : null}

      {error ? <p className="text-destructive text-xs">{error}</p> : null}

      {status?.enabled ? (
        <div className="space-y-2 text-xs">
          <p>
            Status: {status.connected ? "Token active" : "No token"}
            {status.providerId ? (
              <>
                {" "}
                · Provider id: <code>{status.providerId}</code>
              </>
            ) : null}
          </p>
          {status.baseUrl ? (
            <p>
              SCIM base URL: <code className="break-all">{status.baseUrl}</code>
            </p>
          ) : null}
          {token ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2">
              Bearer token (copy now; shown once): <code className="break-all">{token}</code>
            </p>
          ) : null}
          {canManage ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => void runAction("generate")}
              >
                {status.connected ? "Rotate token" : "Generate token"}
              </Button>
              {status.connected ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void runAction("revoke")}
                >
                  Revoke
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Only workspace owners or admins can manage SCIM.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
