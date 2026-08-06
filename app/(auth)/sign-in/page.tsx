"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { safeCallbackUrl } from "@/lib/auth/safe-callback-url";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [openSignupAllowed, setOpenSignupAllowed] = useState(false);
  const [bootstrapAllowed, setBootstrapAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/auth/signup-status");
        const data: unknown = await response.json();
        if (cancelled || typeof data !== "object" || data === null) {
          return;
        }
        setOpenSignupAllowed("openSignupAllowed" in data && Boolean(data.openSignupAllowed));
        setBootstrapAllowed("bootstrapAllowed" in data && Boolean(data.bootstrapAllowed));
      } catch {
        // ignore
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
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    setPending(false);
    if (signInError) {
      setError("Invalid email or password.");
      return;
    }
    router.replace(callbackUrl);
    router.refresh();
  }

  return (
    <form
      className="border-border bg-card w-full max-w-sm space-y-4 rounded-2xl border p-6 shadow-sm"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground text-sm">Use your Brain host account.</p>
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
          autoComplete="current-password"
          id="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-muted-foreground text-center text-xs">
        {bootstrapAllowed ? (
          <>
            First time on this host?{" "}
            <Link className="text-foreground underline underline-offset-2" href="/setup">
              Create the operator account
            </Link>
          </>
        ) : openSignupAllowed ? (
          <>
            No account yet?{" "}
            <Link className="text-foreground underline underline-offset-2" href="/sign-up">
              Create an account
            </Link>
          </>
        ) : (
          <>This host is invite-only. Use an invite link from a workspace admin.</>
        )}
      </p>
    </form>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground text-sm">Loading…</div>}>
      <SignInForm />
    </Suspense>
  );
}
