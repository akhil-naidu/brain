"use client";

import { useState, type FormEvent } from "react";
import { AuthFooterNote, AuthLink, AuthPanel, AuthPanelHeader } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to send a reset link.",
        );
        setPending(false);
        return;
      }
      setMessage(
        typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string"
          ? data.message
          : "If an account exists for that email, a reset link was sent.",
      );
      setPending(false);
    } catch {
      setPending(false);
      setError("Unable to send a reset link.");
    }
  }

  return (
    <AuthPanel>
      <AuthPanelHeader
        description="Enter your email and we’ll send a reset link when self-serve reset is enabled on this host."
        title="Forgot password"
      />

      <form
        className="space-y-6"
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            autoComplete="username"
            className="h-11"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            required
            type="email"
            value={email}
          />
        </Field>
        <Button className="h-11 w-full" disabled={pending} type="submit">
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <output className="text-muted-foreground text-sm">{message}</output> : null}

      <AuthFooterNote>
        Remembered it? <AuthLink href="/sign-in">Back to sign in</AuthLink>
      </AuthFooterNote>
    </AuthPanel>
  );
}
