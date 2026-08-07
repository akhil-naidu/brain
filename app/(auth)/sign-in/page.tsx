"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import {
  AuthDivider,
  AuthFooterNote,
  AuthLink,
  AuthPanel,
  AuthPanelHeader,
} from "@/components/auth/auth-shell";
import { BrainBoot } from "@/components/loading/brain-boot";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
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
  const [forgotPasswordAvailable, setForgotPasswordAvailable] = useState(false);

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
        setForgotPasswordAvailable(
          "forgotPasswordAvailable" in data && Boolean(data.forgotPasswordAvailable),
        );
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
    <AuthPanel>
      <AuthPanelHeader
        description={
          signupMode === "sso-only" && !bootstrapAllowed
            ? "Use your organization SSO to continue."
            : "Sign in with your account on this host."
        }
        title="Sign in"
      />

      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          autoComplete="username"
          className="h-11"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          required={passwordSignInAllowed}
          type="email"
          value={email}
        />
      </Field>

      {ssoAvailable ? (
        <Button
          className="h-11 w-full"
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
          className="space-y-6"
          onSubmit={(event) => {
            void onSubmit(event);
          }}
        >
          {ssoAvailable ? <AuthDivider label="or password" /> : null}
          <Field>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              {forgotPasswordAvailable ? (
                <span className="text-xs">
                  <AuthLink href="/forgot-password">Forgot password?</AuthLink>
                </span>
              ) : null}
            </div>
            <Input
              autoComplete="current-password"
              className="h-11"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </Field>
          <Button className="h-11 w-full" disabled={pending} type="submit">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      ) : null}

      {!passwordSignInAllowed && !ssoAvailable ? (
        <p className="text-destructive text-sm">
          This host requires SSO, but the license does not allow it. Ask the instance admin.
        </p>
      ) : null}

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <AuthFooterNote>
        {bootstrapAllowed ? (
          <>
            First time on this host? <AuthLink href="/setup">Create the operator account</AuthLink>
          </>
        ) : openSignupAllowed ? (
          <>
            No account yet? <AuthLink href="/sign-up">Create an account</AuthLink>
          </>
        ) : signupMode === "sso-only" ? (
          <>Password self-signup is disabled. Use company SSO or an invite link.</>
        ) : (
          <>This host is invite-only. Use an invite link from a workspace admin.</>
        )}
      </AuthFooterNote>
    </AuthPanel>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<BrainBoot label="Preparing sign-in…" size="sm" />}>
      <SignInForm />
    </Suspense>
  );
}
