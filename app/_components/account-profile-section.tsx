"use client";

import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import {
  DISPLAY_NAME_MAX_LENGTH,
  displayNameErrorMessage,
  parseDisplayName,
} from "@/lib/auth/display-name";
import { SettingsPanel, SettingsSection } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function AccountProfileSection() {
  const { data: session } = authClient.useSession();
  const email = session?.user?.email?.trim() || null;
  const sessionName = session?.user?.name?.trim() || "";

  const [name, setName] = useState(sessionName);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profilePending, setProfilePending] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);

  useEffect(() => {
    setName(sessionName);
  }, [sessionName]);

  async function onSaveProfile(event: FormEvent) {
    event.preventDefault();
    const displayName = parseDisplayName(name);
    if (!displayName) {
      setProfileError(displayNameErrorMessage());
      return;
    }
    setProfilePending(true);
    setProfileError(null);
    setProfileSaved(false);
    const { error: updateError } = await authClient.updateUser({ name: displayName });
    setProfilePending(false);
    if (updateError) {
      setProfileError(updateError.message || "Unable to update name.");
      return;
    }
    setName(displayName);
    setProfileSaved(true);
  }

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordPending(true);
    setPasswordError(null);
    setPasswordSaved(false);
    const { error: changeError } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions,
    });
    setPasswordPending(false);
    if (changeError) {
      setPasswordError(
        changeError.message ||
          "Unable to change password. Check your current password, or ask an admin if you sign in with SSO only.",
      );
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSaved(true);
  }

  return (
    <>
      <SettingsSection description="Your identity on this Brain host." title="Profile">
        <SettingsPanel className="p-5">
          <form
            className="max-w-md space-y-5"
            onSubmit={(event) => {
              void onSaveProfile(event);
            }}
          >
            <Field>
              <FieldLabel htmlFor="profile-name">Name</FieldLabel>
              <Input
                autoComplete="name"
                id="profile-name"
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                onChange={(event) => {
                  setProfileSaved(false);
                  setName(event.target.value);
                }}
                required
                type="text"
                value={name}
              />
              <FieldDescription>
                Shown in the account menu and workspace people lists.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-email">Email</FieldLabel>
              <Input id="profile-email" readOnly type="email" value={email || ""} />
              <FieldDescription>
                Email is used for sign-in and cannot be changed here.
              </FieldDescription>
            </Field>

            {profileError ? (
              <p className="text-destructive text-sm" role="alert">
                {profileError}
              </p>
            ) : null}
            {profileSaved ? (
              <output className="text-muted-foreground text-sm">Profile updated.</output>
            ) : null}

            <Button disabled={profilePending} type="submit">
              {profilePending ? "Saving…" : "Save profile"}
            </Button>
          </form>
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
              void onChangePassword(event);
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

            {passwordError ? (
              <p className="text-destructive text-sm" role="alert">
                {passwordError}
              </p>
            ) : null}
            {passwordSaved ? (
              <output className="text-muted-foreground text-sm">Password updated.</output>
            ) : null}

            <Button disabled={passwordPending} type="submit">
              {passwordPending ? "Updating…" : "Update password"}
            </Button>
          </form>
        </SettingsPanel>
      </SettingsSection>
    </>
  );
}
