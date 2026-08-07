"use client";

import { useEffect, useState } from "react";
import { InstanceUsersSection } from "@/app/_components/instance-users-section";
import { notifyWorkspacesChanged } from "@/lib/auth/workspace-events";
import { FormFieldsSkeleton } from "@/components/loading/skeletons";
import {
  SettingsBadge,
  SettingsPanel,
  SettingsSection,
  SettingsShell,
} from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel, FieldSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { parseInstancePolicies } from "@/lib/auth/parse-policies";
import type { InstancePolicies } from "@/lib/auth/workspaces/types";
import { cn } from "@/lib/utils";

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

function EntitlementChip({
  label,
  allowed,
}: {
  readonly label: string;
  readonly allowed: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium",
        allowed
          ? "border-primary/25 bg-primary/8 text-foreground"
          : "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {label}
      <span className="text-muted-foreground ml-1.5 font-normal">{allowed ? "on" : "off"}</span>
    </span>
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
      notifyWorkspacesChanged();
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
      notifyWorkspacesChanged();
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
      notifyWorkspacesChanged();
    } catch {
      setPending(false);
      setError("Unable to clear license.");
    }
  }

  if (error && !policies) {
    return (
      <SettingsShell title="Instance">
        <p className="text-destructive text-sm">{error}</p>
      </SettingsShell>
    );
  }

  if (!policies) {
    return (
      <SettingsShell
        description="Host-wide license and policies for this Brain deployment."
        title="Instance"
      >
        <SettingsSection title="Policies">
          <SettingsPanel className="p-4">
            <FormFieldsSkeleton fields={4} />
          </SettingsPanel>
        </SettingsSection>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell
      description="Host-wide license and policies for this Brain deployment."
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <SettingsBadge>
            {entitlements?.source === "license" ? "Licensed" : "Self-host"}
          </SettingsBadge>
          {canManage ? (
            <SettingsBadge>Admin</SettingsBadge>
          ) : (
            <SettingsBadge>View only</SettingsBadge>
          )}
        </div>
      }
      title="Instance"
    >
      <SettingsSection
        description={
          entitlements?.source === "license"
            ? "Installed license controls which features can be enabled."
            : "No license installed — features stay unlocked for self-host defaults."
        }
        title="License"
      >
        <SettingsPanel className="space-y-5 p-5">
          {entitlements ? (
            <div className="flex flex-wrap gap-2">
              <EntitlementChip
                allowed={entitlements.maxUsers === null || entitlements.maxUsers > 0}
                label={
                  entitlements.maxUsers === null
                    ? "Unlimited users"
                    : `${entitlements.maxUsers} users`
                }
              />
              <EntitlementChip allowed={entitlements.openSignup} label="Open signup" />
              <EntitlementChip allowed={entitlements.sso} label="SSO" />
              <EntitlementChip allowed={entitlements.multiWorkspace} label="Multi-workspace" />
              <EntitlementChip allowed={entitlements.byoa} label="BYOA" />
            </div>
          ) : null}
          {entitlements?.expiresAt ? (
            <p className="text-muted-foreground text-xs">Expires {entitlements.expiresAt}</p>
          ) : null}

          {canManage ? (
            <div className="border-border/70 space-y-3 border-t pt-4">
              <Field>
                <FieldLabel htmlFor="license-key">License key</FieldLabel>
                <Input
                  id="license-key"
                  onChange={(event) => setLicenseKey(event.target.value)}
                  placeholder="BRAIN1...."
                  value={licenseKey}
                />
              </Field>
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
        </SettingsPanel>
      </SettingsSection>

      <SettingsSection
        description="These policies apply to every workspace on this host."
        title="Policies"
      >
        <SettingsPanel className="divide-border/70 divide-y">
          <div className="space-y-3 p-5">
            <Field className="max-w-md">
              <FieldLabel htmlFor="signup-mode">Signup mode</FieldLabel>
              <FieldSelect
                disabled={!canManage || pending}
                id="signup-mode"
                onValueChange={(value) => {
                  if (value === "open" || value === "invite-only" || value === "sso-only") {
                    setSaved(false);
                    setPolicies({ ...policies, signupMode: value });
                  }
                }}
                options={[
                  { value: "invite-only", label: "Invite only" },
                  {
                    value: "open",
                    label: "Open signup",
                    disabled: entitlements?.openSignup === false,
                  },
                  {
                    value: "sso-only",
                    label: entitlements?.sso ? "SSO only" : "SSO only (locked by license)",
                    disabled: entitlements?.sso === false,
                  },
                ]}
                value={policies.signupMode}
              />
              <FieldDescription>
                Invite only is the self-host default. Open signup enables account creation for
                anyone when the license allows it.
              </FieldDescription>
            </Field>
          </div>

          <div className="flex items-center justify-between gap-6 p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium">Allow creating workspaces</p>
              <p className="text-muted-foreground text-xs">
                When off, only instance admins can create team workspaces.
              </p>
            </div>
            <Switch
              checked={policies.allowCreateWorkspace}
              disabled={!canManage || pending || entitlements?.multiWorkspace === false}
              onCheckedChange={(checked) => {
                setSaved(false);
                setPolicies({ ...policies, allowCreateWorkspace: checked });
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-6 p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium">Auto personal workspace</p>
              <p className="text-muted-foreground text-xs">
                Create a Personal workspace for each new user.
              </p>
            </div>
            <Switch
              checked={policies.autoPersonalWorkspace}
              disabled={!canManage || pending}
              onCheckedChange={(checked) => {
                setSaved(false);
                setPolicies({ ...policies, autoPersonalWorkspace: checked });
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-6 p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium">Allow forgot password</p>
              <p className="text-muted-foreground text-xs">
                When off, sign-in hides self-serve reset. Admins can still reset passwords below.
                Requires SMTP for email delivery when on.
              </p>
            </div>
            <Switch
              checked={policies.allowForgotPassword}
              disabled={!canManage || pending}
              onCheckedChange={(checked) => {
                setSaved(false);
                setPolicies({ ...policies, allowForgotPassword: checked });
              }}
            />
          </div>
        </SettingsPanel>
      </SettingsSection>

      <InstanceUsersSection canManage={canManage} />

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {canManage ? (
        <div className="border-border/70 bg-background/90 sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <p className="text-muted-foreground text-sm">
            {saved ? "Saved." : "Unsaved policy changes stay local until you save."}
          </p>
          <Button
            disabled={pending}
            onClick={() => {
              void save(policies);
            }}
            type="button"
          >
            {pending ? "Saving…" : "Save policies"}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          You can view these settings. Only the instance admin can change them.
        </p>
      )}
    </SettingsShell>
  );
}
