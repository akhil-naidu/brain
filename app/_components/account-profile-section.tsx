"use client";

import { KeyRoundIcon, MailIcon } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import {
  DISPLAY_NAME_MAX_LENGTH,
  displayNameErrorMessage,
  parseDisplayName,
} from "@/lib/auth/display-name";
import {
  SettingsBadge,
  SettingsPanel,
  SettingsSection,
} from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

function userInitial(name: string, email: string | null): string {
  const source = name.trim() || email?.trim() || "?";
  return source.slice(0, 1).toUpperCase();
}

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

  const previewName = name.trim() || sessionName || "Your name";
  const nameDirty = name.trim() !== sessionName;
  const initial = userInitial(previewName, email);

  async function onSaveProfile(event: FormEvent) {
    event.preventDefault();
    const displayName = parseDisplayName(name);
    if (!displayName) {
      setProfileError(displayNameErrorMessage());
      return;
    }
    if (displayName === sessionName) {
      setProfileSaved(false);
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
      <SettingsSection
        description="How you appear in the account menu and workspace people lists."
        title="Identity"
      >
        <SettingsPanel className="overflow-hidden">
          <div className="bg-muted/25 border-border/70 relative border-b px-5 py-6">
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="bg-primary/12 text-foreground ring-border/60 flex size-14 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold ring-1"
              >
                {initial}
              </span>
              <div className="min-w-0 space-y-1.5">
                <p className="truncate text-lg font-semibold tracking-tight">{previewName}</p>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {email ? (
                    <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-sm">
                      <MailIcon aria-hidden className="size-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{email}</span>
                    </p>
                  ) : null}
                  <SettingsBadge>Sign-in email</SettingsBadge>
                </div>
              </div>
            </div>
          </div>

          <form
            className="space-y-5 p-5"
            onSubmit={(event) => {
              void onSaveProfile(event);
            }}
          >
            <Field className="max-w-md">
              <FieldLabel htmlFor="profile-name">Display name</FieldLabel>
              <Input
                autoComplete="name"
                id="profile-name"
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                onChange={(event) => {
                  setProfileSaved(false);
                  setProfileError(null);
                  setName(event.target.value);
                }}
                placeholder="Your name"
                required
                type="text"
                value={name}
              />
              <FieldDescription>
                This updates live in the preview above. Email stays fixed for sign-in.
              </FieldDescription>
            </Field>

            {profileError ? (
              <p className="text-destructive text-sm" role="alert">
                {profileError}
              </p>
            ) : null}
            {profileSaved ? (
              <output className="text-muted-foreground text-sm">Name updated.</output>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={profilePending || !nameDirty} type="submit">
                {profilePending ? "Saving…" : "Save name"}
              </Button>
              {nameDirty ? (
                <Button
                  disabled={profilePending}
                  onClick={() => {
                    setName(sessionName);
                    setProfileError(null);
                    setProfileSaved(false);
                  }}
                  type="button"
                  variant="ghost"
                >
                  Reset
                </Button>
              ) : (
                <p className="text-muted-foreground text-xs">No unsaved changes</p>
              )}
            </div>
          </form>
        </SettingsPanel>
      </SettingsSection>

      <SettingsSection
        description="Change the password used for email sign-in on this host."
        title="Password"
      >
        <SettingsPanel className="divide-border/70 divide-y overflow-hidden">
          <div className="flex items-start gap-3 px-5 py-4">
            <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
              <KeyRoundIcon aria-hidden className="size-4" />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">Email password</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Use a strong password. Optionally sign out other devices after updating.
              </p>
            </div>
          </div>

          <form
            className="space-y-5 p-5"
            onSubmit={(event) => {
              void onChangePassword(event);
            }}
          >
            <div className="grid max-w-xl gap-5 sm:grid-cols-2">
              <Field className="sm:col-span-2">
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
                <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
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
            </div>

            <div className="border-border/70 flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
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
