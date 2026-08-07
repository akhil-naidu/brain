"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { AuthFooterNote, AuthLink, AuthPanel, AuthPanelHeader } from "@/components/auth/auth-shell";
import { BrainBoot } from "@/components/loading/brain-boot";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const tokenError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(
    tokenError ? "This reset link is invalid or expired." : null,
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setError("This reset link is missing a token. Request a new link from forgot password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError(null);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setPending(false);
    if (resetError) {
      setError(resetError.message || "Unable to reset password. Request a new link.");
      return;
    }
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <AuthPanel>
      <AuthPanelHeader
        description="Choose a new password for your Brain account on this host."
        title="Reset password"
      />

      {!token && !tokenError ? (
        <p className="text-muted-foreground text-sm">
          Open the link from your email, or{" "}
          <AuthLink href="/forgot-password">request a new reset link</AuthLink>.
        </p>
      ) : (
        <form
          className="space-y-6"
          onSubmit={(event) => {
            void onSubmit(event);
          }}
        >
          <Field>
            <FieldLabel htmlFor="password">New password</FieldLabel>
            <Input
              autoComplete="new-password"
              className="h-11"
              id="password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
            <Input
              autoComplete="new-password"
              className="h-11"
              id="confirm"
              minLength={8}
              onChange={(event) => setConfirm(event.target.value)}
              required
              type="password"
              value={confirm}
            />
          </Field>
          <Button className="h-11 w-full" disabled={pending || !token} type="submit">
            {pending ? "Saving…" : "Update password"}
          </Button>
        </form>
      )}

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <AuthFooterNote>
        <AuthLink href="/sign-in">Back to sign in</AuthLink>
      </AuthFooterNote>
    </AuthPanel>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<BrainBoot label="Preparing reset…" size="sm" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
