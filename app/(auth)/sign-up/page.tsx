"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
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
    return <p className="text-muted-foreground text-sm">Checking signup…</p>;
  }

  if (status.bootstrapAllowed) {
    return (
      <div className="border-border bg-card w-full max-w-sm space-y-3 rounded-2xl border p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Create the first account</h1>
        <p className="text-muted-foreground text-sm">
          This host has no users yet. Use setup to create the operator account.
        </p>
        <Button asChild className="w-full">
          <Link href="/setup">Go to setup</Link>
        </Button>
      </div>
    );
  }

  if (!status.openSignupAllowed) {
    return (
      <div className="border-border bg-card w-full max-w-sm space-y-3 rounded-2xl border p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Signup closed</h1>
        <p className="text-muted-foreground text-sm">
          This host is {status.signupMode === "sso-only" ? "SSO-only" : "invite-only"}. Ask an admin
          for an invite link, or sign in if you already have an account.
        </p>
        <Button asChild className="w-full">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      className="border-border bg-card w-full max-w-sm space-y-4 rounded-2xl border p-6 shadow-sm"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Create account</h1>
        <p className="text-muted-foreground text-sm">Sign up for Brain on this host.</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <Input
          autoComplete="username"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <Input
          autoComplete="new-password"
          id="password"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Creating…" : "Create account"}
      </Button>
      <p className="text-muted-foreground text-center text-xs">
        Already have an account?{" "}
        <Link className="text-foreground underline underline-offset-2" href="/sign-in">
          Sign in
        </Link>
      </p>
    </form>
  );
}
