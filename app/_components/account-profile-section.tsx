"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { SettingsPanel, SettingsSection } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function AccountProfileSection() {
  const { data: session } = authClient.useSession();
  const email = session?.user?.email?.trim() || null;
  const name = session?.user?.name?.trim() || null;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setPending(true);
    setError(null);
    setSaved(false);
    const { error: changeError } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions,
    });
    setPending(false);
    if (changeError) {
      setError(
        changeError.message ||
          "Unable to change password. Check your current password, or ask an admin if you sign in with SSO only.",
      );
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSaved(true);
  }

  return (
    <>
      <SettingsSection description="Your identity on this Brain host." title="Profile">
        <SettingsPanel className="space-y-3 p-5">
          <div>
            <p className="text-muted-foreground text-xs">Name</p>
            <p className="text-sm font-medium">{name || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Email</p>
            <p className="text-sm font-medium">{email || "—"}</p>
          </div>
        </SettingsPanel>
      </SettingsSection>

      <SettingsSection
        description="Update the password used for email sign-in on this host."
        title="Password"
      >
        <SettingsPanel className="p-5">
          <form
            className="max-w-md space-y-5"
            onSubmit={(event) => {
              void onSubmit(event);
            }}
          >
            <Field>
              <FieldLabel htmlFor="current-password">Current password</FieldLabel>
              <Input
                autoComplete="current-password"
                id="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                type="password"
                value={currentPassword}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <Input
                autoComplete="new-password"
                id="new-password"
                minLength={8}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                type="password"
                value={newPassword}
              />
              <FieldDescription>At least 8 characters.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
              <Input
                autoComplete="new-password"
                id="confirm-password"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </Field>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Sign out other devices</p>
                <p className="text-muted-foreground text-xs">
                  Revoke other sessions after the password change.
                </p>
              </div>
              <Switch checked={revokeOtherSessions} onCheckedChange={setRevokeOtherSessions} />
            </div>

            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
            {saved ? (
              <output className="text-muted-foreground text-sm">Password updated.</output>
            ) : null}

            <Button disabled={pending} type="submit">
              {pending ? "Updating…" : "Update password"}
            </Button>
          </form>
        </SettingsPanel>
      </SettingsSection>
    </>
  );
}
