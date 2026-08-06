"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";

type InvitePreview = {
  readonly valid: true;
  readonly workspaceName: string;
  readonly email: string | null;
  readonly role: string;
  readonly expiresAt: string;
};

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null | "invalid">(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await authClient.getSession();
        if (!cancelled) {
          setSignedIn(Boolean(session.data?.user));
          if (session.data?.user?.email) {
            setEmail(session.data.user.email);
          }
        }
        const response = await fetch(
          `/api/workspaces/invites/preview?token=${encodeURIComponent(token)}`,
        );
        const data: unknown = await response.json();
        if (cancelled) {
          return;
        }
        if (
          response.ok &&
          typeof data === "object" &&
          data !== null &&
          "valid" in data &&
          data.valid === true &&
          "workspaceName" in data &&
          typeof data.workspaceName === "string"
        ) {
          const boundEmail = "email" in data && typeof data.email === "string" ? data.email : null;
          setPreview({
            valid: true,
            workspaceName: data.workspaceName,
            email: boundEmail,
            role: "role" in data && typeof data.role === "string" ? data.role : "member",
            expiresAt:
              "expiresAt" in data && typeof data.expiresAt === "string" ? data.expiresAt : "",
          });
          if (boundEmail) {
            setEmail(boundEmail);
          }
        } else {
          setPreview("invalid");
        }
      } catch {
        if (!cancelled) {
          setPreview("invalid");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function acceptSignedIn() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces/invites/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to accept invite.",
        );
        setPending(false);
        return;
      }
      router.replace("/chat");
      router.refresh();
    } catch {
      setPending(false);
      setError("Unable to accept invite.");
    }
  }

  async function onRegister(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces/invites/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to create account.",
        );
        setPending(false);
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
    } catch {
      setPending(false);
      setError("Unable to create account.");
    }
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading invite…</p>;
  }

  if (preview === "invalid" || preview === null) {
    return (
      <div className="border-border bg-card w-full max-w-sm space-y-3 rounded-2xl border p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Invite unavailable</h1>
        <p className="text-muted-foreground text-sm">
          This invite is invalid, expired, or revoked.
        </p>
        <Button asChild className="w-full">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (signedIn) {
    return (
      <div className="border-border bg-card w-full max-w-sm space-y-4 rounded-2xl border p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Join workspace</h1>
          <p className="text-muted-foreground text-sm">
            Join <span className="text-foreground font-medium">{preview.workspaceName}</span> as{" "}
            {preview.role}.
          </p>
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Button
          className="w-full"
          disabled={pending}
          onClick={() => {
            void acceptSignedIn();
          }}
          type="button"
        >
          {pending ? "Joining…" : "Accept invite"}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="border-border bg-card w-full max-w-sm space-y-4 rounded-2xl border p-6 shadow-sm"
      onSubmit={(event) => {
        void onRegister(event);
      }}
    >
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Join {preview.workspaceName}</h1>
        <p className="text-muted-foreground text-sm">
          Create an account to join as {preview.role}.
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
          readOnly={Boolean(preview.email)}
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
        {pending ? "Creating…" : "Create account and join"}
      </Button>
      <p className="text-muted-foreground text-center text-xs">
        Already have an account?{" "}
        <Link
          className="text-foreground underline underline-offset-2"
          href={`/sign-in?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
