"use client";

import { MonitorSmartphoneIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import {
  describeUserAgent,
  formatSessionWhen,
  unwrapSessionList,
  type AuthSessionRow,
} from "@/lib/auth/session-display";
import { SettingsRowsSkeleton } from "@/components/loading/skeletons";
import { SettingsPanel, SettingsSection } from "@/components/settings/settings-shell";
import { ActiveIndicator } from "@/components/ui/active-indicator";
import { Button } from "@/components/ui/button";

export function AccountSessionsSection() {
  const router = useRouter();
  const { data: sessionData } = authClient.useSession();
  const currentToken = sessionData?.session?.token ?? null;

  const [sessions, setSessions] = useState<readonly AuthSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const result = await authClient.listSessions();
      if (result.error) {
        setError(result.error.message || "Unable to load sessions.");
        setSessions([]);
        return;
      }
      setSessions(unwrapSessionList(result.data ?? result));
    } catch {
      setError("Unable to load sessions.");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onRevoke(token: string) {
    if (token === currentToken) {
      return;
    }
    if (!window.confirm("Sign out this device? It will need to sign in again.")) {
      return;
    }
    setPendingAction(`revoke:${token}`);
    setError(null);
    try {
      const result = await authClient.revokeSession({ token });
      if (result.error) {
        setError(result.error.message || "Unable to revoke session.");
        setPendingAction(null);
        return;
      }
      setPendingAction(null);
      await refresh();
    } catch {
      setPendingAction(null);
      setError("Unable to revoke session.");
    }
  }

  async function onRevokeOthers() {
    if (!window.confirm("Sign out all other devices? This device stays signed in.")) {
      return;
    }
    setPendingAction("revoke-others");
    setError(null);
    try {
      const result = await authClient.revokeOtherSessions();
      if (result.error) {
        setError(result.error.message || "Unable to revoke other sessions.");
        setPendingAction(null);
        return;
      }
      setPendingAction(null);
      await refresh();
    } catch {
      setPendingAction(null);
      setError("Unable to revoke other sessions.");
    }
  }

  async function onSignOutEverywhere() {
    if (
      !window.confirm("Sign out everywhere, including this device? You will need to sign in again.")
    ) {
      return;
    }
    setPendingAction("revoke-all");
    setError(null);
    try {
      const result = await authClient.revokeSessions();
      if (result.error) {
        setError(result.error.message || "Unable to sign out everywhere.");
        setPendingAction(null);
        return;
      }
      await authClient.signOut();
      router.replace("/sign-in");
      router.refresh();
    } catch {
      setPendingAction(null);
      setError("Unable to sign out everywhere.");
    }
  }

  const otherCount = sessions.filter((row) => row.token !== currentToken).length;
  const busy = pendingAction !== null;

  return (
    <>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <SettingsSection
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || otherCount === 0}
              onClick={() => {
                void onRevokeOthers();
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {pendingAction === "revoke-others" ? "Signing out…" : "Sign out other devices"}
            </Button>
            <Button
              disabled={busy || sessions.length === 0}
              onClick={() => {
                void onSignOutEverywhere();
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              {pendingAction === "revoke-all" ? "Signing out…" : "Sign out everywhere"}
            </Button>
          </div>
        }
        description="Each row is a browser or device with an active Brain login."
        title="Active sessions"
      >
        <SettingsPanel>
          {loading ? (
            <SettingsRowsSkeleton rows={3} />
          ) : sessions.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-sm">No active sessions found.</p>
          ) : (
            <ul className="divide-border/70 divide-y">
              {sessions.map((row) => {
                const isCurrent = Boolean(currentToken && row.token === currentToken);
                const rowBusy = pendingAction === `revoke:${row.token}`;
                return (
                  <li
                    className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    key={row.token}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                        <MonitorSmartphoneIcon aria-hidden className="size-4" />
                      </span>
                      <div className="min-w-0 space-y-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{describeUserAgent(row.userAgent)}</p>
                          {isCurrent ? <ActiveIndicator /> : null}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {row.ipAddress?.trim() || "IP unknown"}
                          {" · "}
                          Last active {formatSessionWhen(row.updatedAt)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Signed in {formatSessionWhen(row.createdAt)}
                          {" · "}
                          Expires {formatSessionWhen(row.expiresAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0">
                      {isCurrent ? (
                        <span className="text-muted-foreground self-center text-xs">
                          This device
                        </span>
                      ) : (
                        <Button
                          disabled={busy}
                          onClick={() => {
                            void onRevoke(row.token);
                          }}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          {rowBusy ? "Revoking…" : "Revoke"}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SettingsPanel>
      </SettingsSection>
    </>
  );
}
