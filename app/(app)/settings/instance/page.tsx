"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { parseInstancePolicies } from "@/lib/auth/parse-policies";
import type { InstancePolicies } from "@/lib/auth/workspaces/types";

type Entitlements = {
  readonly maxUsers: number | null;
  readonly sso: boolean;
  readonly multiWorkspace: boolean;
  readonly byoa: boolean;
  readonly openSignup: boolean;
  readonly source: "license" | "unlicensed";
  readonly expiresAt: string | null;
  readonly issuedAt: string | null;
};

function isEntitlements(value: unknown): value is Entitlements {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "source" in value &&
    (value.source === "license" || value.source === "unlicensed") &&
    "sso" in value &&
    typeof value.sso === "boolean" &&
    "multiWorkspace" in value &&
    typeof value.multiWorkspace === "boolean" &&
    "byoa" in value &&
    typeof value.byoa === "boolean" &&
    "openSignup" in value &&
    typeof value.openSignup === "boolean"
  );
}

export default function InstanceSettingsPage() {
  const [policies, setPolicies] = useState<InstancePolicies | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [licenseKey, setLicenseKey] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [policiesResponse, licenseResponse] = await Promise.all([
          fetch("/api/instance/policies"),
          fetch("/api/instance/license"),
        ]);
        const policiesData: unknown = await policiesResponse.json();
        const licenseData: unknown = await licenseResponse.json();
        if (cancelled) {
          return;
        }
        if (!policiesResponse.ok || typeof policiesData !== "object" || policiesData === null) {
          setError("Unable to load instance policies.");
          return;
        }
        setCanManage("canManage" in policiesData && Boolean(policiesData.canManage));
        if ("policies" in policiesData) {
          const parsed = parseInstancePolicies(policiesData.policies);
          if (parsed) {
            setPolicies(parsed);
          }
        }
        if (
          licenseResponse.ok &&
          typeof licenseData === "object" &&
          licenseData !== null &&
          "entitlements" in licenseData &&
          isEntitlements(licenseData.entitlements)
        ) {
          setEntitlements(licenseData.entitlements);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load instance settings.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(next: InstancePolicies) {
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/instance/policies", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to save policies.",
        );
        setPending(false);
        return;
      }
      if (typeof data === "object" && data !== null && "policies" in data) {
        const parsed = parseInstancePolicies(data.policies);
        if (parsed) {
          setPolicies(parsed);
        }
      }
      setSaved(true);
      setPending(false);
    } catch {
      setPending(false);
      setError("Unable to save policies.");
    }
  }

  async function installLicense() {
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/instance/license", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: licenseKey }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to install license.",
        );
        setPending(false);
        return;
      }
      if (
        typeof data === "object" &&
        data !== null &&
        "entitlements" in data &&
        isEntitlements(data.entitlements)
      ) {
        setEntitlements(data.entitlements);
      }
      setLicenseKey("");
      setSaved(true);
      setPending(false);
    } catch {
      setPending(false);
      setError("Unable to install license.");
    }
  }

  async function clearLicense() {
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/instance/license", { method: "DELETE" });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to clear license.",
        );
        setPending(false);
        return;
      }
      if (
        typeof data === "object" &&
        data !== null &&
        "entitlements" in data &&
        isEntitlements(data.entitlements)
      ) {
        setEntitlements(data.entitlements);
      }
      setSaved(true);
      setPending(false);
    } catch {
      setPending(false);
      setError("Unable to clear license.");
    }
  }

  if (error && !policies) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (!policies) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-muted-foreground text-sm">Loading instance settings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Instance settings</h1>
        <p className="text-muted-foreground text-sm">
          Host-wide license entitlements and policies for signup and workspace provisioning.
        </p>
      </div>

      {!canManage ? (
        <p className="text-muted-foreground text-sm">
          You can view these settings. Only the instance admin can change them.
        </p>
      ) : null}

      <div className="border-border space-y-3 rounded-xl border p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">License</p>
          <p className="text-muted-foreground text-xs">
            {entitlements?.source === "license"
              ? "Using installed license entitlements."
              : "No license installed — all features unlocked (self-host default)."}
          </p>
        </div>
        {entitlements ? (
          <ul className="text-muted-foreground space-y-1 text-xs">
            <li>
              Max users: {entitlements.maxUsers === null ? "Unlimited" : entitlements.maxUsers}
            </li>
            <li>Open signup: {entitlements.openSignup ? "Allowed" : "Locked"}</li>
            <li>SSO mode: {entitlements.sso ? "Allowed" : "Locked"}</li>
            <li>Multi-workspace: {entitlements.multiWorkspace ? "Allowed" : "Locked"}</li>
            <li>Workspace BYOA: {entitlements.byoa ? "Allowed" : "Locked"}</li>
            {entitlements.expiresAt ? <li>Expires: {entitlements.expiresAt}</li> : null}
          </ul>
        ) : null}
        {canManage ? (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="license-key">
              License key
            </label>
            <Input
              id="license-key"
              onChange={(event) => setLicenseKey(event.target.value)}
              placeholder="BRAIN1...."
              value={licenseKey}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={pending || !licenseKey.trim()}
                onClick={() => {
                  void installLicense();
                }}
                size="sm"
                type="button"
              >
                Install license
              </Button>
              {entitlements?.source === "license" ? (
                <Button
                  disabled={pending}
                  onClick={() => {
                    void clearLicense();
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Clear license
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-border space-y-4 rounded-xl border p-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="signup-mode">
            Signup mode
          </label>
          <select
            className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
            disabled={!canManage || pending}
            id="signup-mode"
            onChange={(event) => {
              const value = event.target.value;
              if (value === "open" || value === "invite-only" || value === "sso-only") {
                setPolicies({ ...policies, signupMode: value });
              }
            }}
            value={policies.signupMode}
          >
            <option value="invite-only">Invite only</option>
            <option disabled={entitlements?.openSignup === false} value="open">
              Open signup
            </option>
            <option disabled={entitlements?.sso === false} value="sso-only">
              SSO only {entitlements?.sso ? "(policy only — IdP later)" : "(locked by license)"}
            </option>
          </select>
          <p className="text-muted-foreground text-xs">
            Invite only is the self-host default. Open signup enables `/sign-up` for anyone when the
            license allows it.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Allow creating workspaces</p>
            <p className="text-muted-foreground text-xs">
              When off, only instance admins can create team workspaces.
            </p>
          </div>
          <Switch
            checked={policies.allowCreateWorkspace}
            disabled={!canManage || pending || entitlements?.multiWorkspace === false}
            onCheckedChange={(checked) => {
              setPolicies({ ...policies, allowCreateWorkspace: checked });
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Auto personal workspace</p>
            <p className="text-muted-foreground text-xs">
              Create a Personal workspace for each new user.
            </p>
          </div>
          <Switch
            checked={policies.autoPersonalWorkspace}
            disabled={!canManage || pending}
            onCheckedChange={(checked) => {
              setPolicies({ ...policies, autoPersonalWorkspace: checked });
            }}
          />
        </div>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {saved ? <p className="text-muted-foreground text-sm">Saved.</p> : null}

      {canManage ? (
        <Button
          disabled={pending}
          onClick={() => {
            void save(policies);
          }}
          type="button"
        >
          {pending ? "Saving…" : "Save policy changes"}
        </Button>
      ) : null}
    </div>
  );
}
