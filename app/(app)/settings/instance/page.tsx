"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { parseInstancePolicies } from "@/lib/auth/parse-policies";
import type { InstancePolicies } from "@/lib/auth/workspaces/types";

export default function InstanceSettingsPage() {
  const [policies, setPolicies] = useState<InstancePolicies | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/instance/policies");
        const data: unknown = await response.json();
        if (cancelled || !response.ok || typeof data !== "object" || data === null) {
          if (!cancelled) {
            setError("Unable to load instance policies.");
          }
          return;
        }
        setCanManage("canManage" in data && Boolean(data.canManage));
        if ("policies" in data) {
          const parsed = parseInstancePolicies(data.policies);
          if (parsed) {
            setPolicies(parsed);
          }
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load instance policies.");
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
          Host-wide policies for signup and workspace provisioning.
        </p>
      </div>

      {!canManage ? (
        <p className="text-muted-foreground text-sm">
          You can view these policies. Only the instance admin can change them.
        </p>
      ) : null}

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
            <option value="open">Open signup</option>
            <option value="sso-only" disabled>
              SSO only (coming later)
            </option>
          </select>
          <p className="text-muted-foreground text-xs">
            Invite only is the self-host default. Open signup enables `/sign-up` for anyone.
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
            disabled={!canManage || pending}
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
          {pending ? "Saving…" : "Save changes"}
        </Button>
      ) : null}
    </div>
  );
}
