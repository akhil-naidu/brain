"use client";

import { useCallback, useEffect, useState } from "react";
import { SettingsPanel, SettingsSection } from "@/components/settings/settings-shell";
import { SettingsRowsSkeleton } from "@/components/loading/skeletons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type InstanceUser = {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly hasPassword: boolean;
};

export function InstanceUsersSection({ canManage }: { readonly canManage: boolean }) {
  const [users, setUsers] = useState<readonly InstanceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<InstanceUser | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/instance/users");
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to load users.",
        );
        setUsers([]);
        return;
      }
      if (
        typeof data === "object" &&
        data !== null &&
        "users" in data &&
        Array.isArray(data.users)
      ) {
        setUsers(
          data.users.flatMap((row: unknown): InstanceUser[] => {
            if (typeof row !== "object" || row === null) {
              return [];
            }
            const id = "id" in row && typeof row.id === "string" ? row.id : null;
            const email = "email" in row && typeof row.email === "string" ? row.email : null;
            if (!id || !email) {
              return [];
            }
            return [
              {
                id,
                email,
                name: "name" in row && typeof row.name === "string" ? row.name : null,
                hasPassword: "hasPassword" in row && Boolean(row.hasPassword),
              },
            ];
          }),
        );
      }
    } catch {
      setError("Unable to load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [canManage, refresh]);

  async function onReset() {
    if (!target) {
      return;
    }
    if (password.length < 8) {
      setDialogError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setDialogError("Passwords do not match.");
      return;
    }
    setPending(true);
    setDialogError(null);
    try {
      const response = await fetch(
        `/api/instance/users/${encodeURIComponent(target.id)}/password`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ newPassword: password }),
        },
      );
      const data: unknown = await response.json();
      if (!response.ok) {
        setDialogError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to reset password.",
        );
        setPending(false);
        return;
      }
      setPending(false);
      setTarget(null);
      setPassword("");
      setConfirm("");
      setSavedMessage(
        typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string"
          ? data.message
          : "Password updated.",
      );
      await refresh();
    } catch {
      setPending(false);
      setDialogError("Unable to reset password.");
    }
  }

  if (!canManage) {
    return null;
  }

  return (
    <>
      <SettingsSection
        description="Reset a password when a user is locked out or self-serve forgot-password is disabled."
        title="Users"
      >
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        {savedMessage ? (
          <output className="text-muted-foreground text-sm">{savedMessage}</output>
        ) : null}
        <SettingsPanel>
          {loading ? (
            <SettingsRowsSkeleton rows={3} />
          ) : users.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-sm">No users found.</p>
          ) : (
            <ul className="divide-border/70 divide-y">
              {users.map((user) => (
                <li
                  className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  key={user.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {user.name?.trim() || user.email}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {user.email}
                      {" · "}
                      {user.hasPassword ? "Password sign-in" : "No password (SSO or unset)"}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setSavedMessage(null);
                      setDialogError(null);
                      setPassword("");
                      setConfirm("");
                      setTarget(user);
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Reset password
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </SettingsPanel>
      </SettingsSection>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setTarget(null);
            setPending(false);
            setDialogError(null);
          }
        }}
        open={target !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for {target?.email}. All of their sessions will be signed out.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="admin-new-password">New password</FieldLabel>
              <Input
                autoComplete="new-password"
                id="admin-new-password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
              <FieldDescription>At least 8 characters.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-confirm-password">Confirm password</FieldLabel>
              <Input
                autoComplete="new-password"
                id="admin-confirm-password"
                minLength={8}
                onChange={(event) => setConfirm(event.target.value)}
                type="password"
                value={confirm}
              />
            </Field>
            {dialogError ? (
              <p className="text-destructive text-sm" role="alert">
                {dialogError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() => setTarget(null)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                void onReset();
              }}
              type="button"
            >
              {pending ? "Saving…" : "Set password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
