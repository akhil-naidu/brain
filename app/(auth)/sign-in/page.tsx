"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { safeCallbackUrl } from "@/lib/auth/safe-callback-url";
import type { SignupMode } from "@/lib/auth/workspaces/types";

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
  const [signupMode, setSignupMode] = useState<SignupMode | null>(null);
  const [ssoAvailable, setSsoAvailable] = useState(false);

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
        setSsoAvailable("ssoAvailable" in data && Boolean(data.ssoAvailable));
        if (
          "signupMode" in data &&
          (data.signupMode === "open" ||
            data.signupMode === "invite-only" ||
            data.signupMode === "sso-only")
        ) {
          setSignupMode(data.signupMode);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const passwordSignInAllowed = bootstrapAllowed || signupMode !== "sso-only";

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

  async function onCompanySso() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setError("Enter your work email to continue with company SSO.");
      return;
    }
    setPending(true);
    setError(null);
    const { error: ssoError } = await authClient.signIn.sso({
      email: trimmed,
      callbackURL: callbackUrl,
      errorCallbackURL: `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    });
    if (ssoError) {
      setPending(false);
      setError(ssoError.message || "Unable to start company SSO.");
    }
  }

  return (
    <div className="border-border bg-card w-full max-w-sm space-y-4 rounded-2xl border p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground text-sm">
          {signupMode === "sso-only" && !bootstrapAllowed
            ? "Use your organization SSO to continue."
            : "Use your Brain host account."}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <Input
          autoComplete="username"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          required={passwordSignInAllowed}
          type="email"
          value={email}
        />
      </div>

      {ssoAvailable ? (
        <Button
          className="w-full"
          disabled={pending}
          onClick={() => {
            void onCompanySso();
          }}
          type="button"
          variant={passwordSignInAllowed ? "outline" : "default"}
        >
          {pending ? "Redirecting…" : "Continue with company SSO"}
        </Button>
      ) : null}

      {passwordSignInAllowed ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            void onSubmit(event);
          }}
        >
          {ssoAvailable ? (
            <p className="text-muted-foreground text-center text-xs">or continue with password</p>
          ) : null}
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
          <Button className="w-full" disabled={pending} type="submit">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      ) : null}

      {!passwordSignInAllowed && !ssoAvailable ? (
        <p className="text-destructive text-sm">
          This host requires SSO, but the license does not allow it. Ask the instance admin.
        </p>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

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
        ) : signupMode === "sso-only" ? (
          <>Password self-signup is disabled. Use company SSO or an invite link.</>
        ) : (
          <>This host is invite-only. Use an invite link from a workspace admin.</>
        )}
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground text-sm">Loading…</div>}>
      <SignInForm />
    </Suspense>
  );
}
