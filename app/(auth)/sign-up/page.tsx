"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthFooterNote, AuthLink, AuthPanel, AuthPanelHeader } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";

type SignupStatus = {
  readonly openSignupAllowed: boolean;
  readonly bootstrapAllowed: boolean;
  readonly signupMode: string;
};

export default function SignUpPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SignupStatus | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/auth/signup-status");
        const data: unknown = await response.json();
        if (cancelled || typeof data !== "object" || data === null) {
          return;
        }
        setStatus({
          openSignupAllowed: "openSignupAllowed" in data && Boolean(data.openSignupAllowed),
          bootstrapAllowed: "bootstrapAllowed" in data && Boolean(data.bootstrapAllowed),
          signupMode:
            "signupMode" in data && typeof data.signupMode === "string"
              ? data.signupMode
              : "invite-only",
        });
      } catch {
        if (!cancelled) {
          setStatus({
            openSignupAllowed: false,
            bootstrapAllowed: false,
            signupMode: "invite-only",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const { error: signUpError } = await authClient.signUp.email({
      email,
      password,
      name: email.trim().toLowerCase(),
    });
    if (signUpError) {
      setPending(false);
      setError(signUpError.message || "Unable to create account.");
      return;
    }
    const { error: signInError } = await authClient.signIn.email({ email, password });
    setPending(false);
    if (signInError) {
      router.replace("/sign-in");
      return;
    }
    router.replace("/chat");
    router.refresh();
  }

  if (status === null) {
    return (
      <>
        <p className="text-muted-foreground auth-fade-up text-sm">Checking signup…</p>
      </>
    );
  }

  if (status.bootstrapAllowed) {
    return (
      <>
        <AuthPanel>
          <AuthPanelHeader
            description="This host has no users yet. Use setup to create the operator account."
            title="Create the first account"
          />
          <Button asChild className="h-11 w-full">
            <Link href="/setup">Go to setup</Link>
          </Button>
        </AuthPanel>
      </>
    );
  }

  if (!status.openSignupAllowed) {
    return (
      <>
        <AuthPanel>
          <AuthPanelHeader
            description={
              <>
                This host is {status.signupMode === "sso-only" ? "SSO-only" : "invite-only"}. Ask an
                admin for an invite link, or sign in if you already have an account.
              </>
            }
            title="Signup closed"
          />
          <Button asChild className="h-11 w-full">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </AuthPanel>
      </>
    );
  }

  return (
    <>
      <AuthPanel
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        <AuthPanelHeader description="Create your account on this host." title="Create account" />
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
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
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
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="h-11 w-full" disabled={pending} type="submit">
          {pending ? "Creating…" : "Create account"}
        </Button>
        <AuthFooterNote>
          Already have an account? <AuthLink href="/sign-in">Sign in</AuthLink>
        </AuthFooterNote>
      </AuthPanel>
    </>
  );
}
