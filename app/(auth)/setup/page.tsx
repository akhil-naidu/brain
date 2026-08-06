"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";

export default function SetupPage() {
  const router = useRouter();
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
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
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
    return <p className="text-muted-foreground text-sm">Checking setup…</p>;
  }

  if (!allowed) {
    return (
      <div className="border-border bg-card w-full max-w-sm space-y-3 rounded-2xl border p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Setup closed</h1>
        <p className="text-muted-foreground text-sm">
          An operator account already exists on this host.
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
        <h1 className="text-lg font-semibold tracking-tight">Create operator</h1>
        <p className="text-muted-foreground text-sm">
          Bootstrap the first Brain account on this host. Open signup stays off afterward.
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
      {requiresToken ? (
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="bootstrapToken">
            Bootstrap token
          </label>
          <Input
            id="bootstrapToken"
            onChange={(event) => setBootstrapToken(event.target.value)}
            required
            type="password"
            value={bootstrapToken}
          />
        </div>
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
