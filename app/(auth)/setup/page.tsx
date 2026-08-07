"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthPanel, AuthPanelHeader } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { DISPLAY_NAME_MAX_LENGTH, parseDisplayName } from "@/lib/auth/display-name";

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bootstrapToken, setBootstrapToken] = useState("");
  const [requiresToken, setRequiresToken] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/auth/bootstrap");
        const data: unknown = await response.json();
        if (!cancelled) {
          setAllowed(
            typeof data === "object" && data !== null && "allowed" in data && Boolean(data.allowed),
          );
          setRequiresToken(
            typeof data === "object" &&
              data !== null &&
              "requiresToken" in data &&
              Boolean(data.requiresToken),
          );
        }
      } catch {
        if (!cancelled) {
          setAllowed(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const displayName = parseDisplayName(name);
    if (!displayName) {
      setError(`Enter a name between 1 and ${DISPLAY_NAME_MAX_LENGTH} characters.`);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: displayName,
          email,
          password,
          bootstrapToken: bootstrapToken || undefined,
        }),
      });
      const data: unknown = await response.json();
      const errorMessage =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof data.error === "string"
          ? data.error
          : "Unable to create account.";
      if (!response.ok) {
        setError(errorMessage);
        setPending(false);
        return;
      }
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });
      setPending(false);
      if (signInError) {
        router.replace("/sign-in");
        return;
      }
      router.replace("/chat");
      router.refresh();
    } catch {
      setPending(false);
      setError("Unable to create account.");
    }
  }

  if (allowed === null) {
    return (
      <>
        <p className="text-muted-foreground auth-fade-up text-sm">Checking setup…</p>
      </>
    );
  }

  if (!allowed) {
    return (
      <>
        <AuthPanel>
          <AuthPanelHeader
            description="An operator account already exists on this host."
            title="Setup closed"
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
        <AuthPanelHeader
          description="Create the operator account. Open signup stays off afterward."
          title="Create operator"
        />
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            autoComplete="name"
            className="h-11"
            id="name"
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            required
            type="text"
            value={name}
          />
        </Field>
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
        {requiresToken ? (
          <Field>
            <FieldLabel htmlFor="bootstrapToken">Bootstrap token</FieldLabel>
            <Input
              className="h-11"
              id="bootstrapToken"
              onChange={(event) => setBootstrapToken(event.target.value)}
              required
              type="password"
              value={bootstrapToken}
            />
          </Field>
        ) : null}
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="h-11 w-full" disabled={pending} type="submit">
          {pending ? "Creating…" : "Create account"}
        </Button>
      </AuthPanel>
    </>
  );
}
