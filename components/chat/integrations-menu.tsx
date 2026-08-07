"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HammerIcon, Settings2Icon } from "lucide-react";
import { ConnectionSetupDialog } from "@/components/chat/connection-setup-dialog";
import { IntegrationsConnectionActions } from "@/components/chat/integrations-connection-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconTooltip } from "@/components/ui/tooltip";
import type { EnabledConnections } from "@/app/_components/chat-shell-context";
import { CONNECTION_ITEMS } from "@/lib/chat/connection-catalog";
import {
  canEnableConnection,
  connectionAdminSetupHint,
  integrationStatusText,
} from "@/lib/chat/connection-ui";
import {
  disconnectConnection,
  fetchConnectionStatuses,
  getSafeAuthorizeUrl,
  startConnectionAuthorize,
  type ConnectionStatus,
} from "@/lib/chat/connections-status-api";
import { cn } from "@/lib/utils";

export {
  canEnableConnection,
  integrationStatusText,
  shouldOfferConnectionConfigure,
  shouldOfferConnectionConnect,
  shouldOfferConnectionDisconnect,
} from "@/lib/chat/connection-ui";

export function IntegrationsMenu({
  enabledConnections,
  onConnectionEnabledChange,
}: {
  readonly enabledConnections: EnabledConnections;
  readonly onConnectionEnabledChange: (
    connection: keyof EnabledConnections,
    enabled: boolean,
  ) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusById, setStatusById] = useState<ReadonlyMap<string, ConnectionStatus> | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<keyof EnabledConnections | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<keyof EnabledConnections | null>(null);
  const [configureId, setConfigureId] = useState<string | null>(null);

  const loadStatus = () => {
    setLoadingStatus(true);
    setStatusError(null);
    void (async () => {
      try {
        const connections = await fetchConnectionStatuses();
        setStatusById(new Map(connections.map((item) => [item.id, item])));
      } catch (error) {
        setStatusError(
          error instanceof Error ? error.message : "Unable to load connection status.",
        );
      } finally {
        setLoadingStatus(false);
      }
    })();
  };

  useEffect(() => {
    if (!menuOpen && !connectingId) {
      return undefined;
    }

    const onFocus = () => {
      loadStatus();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [connectingId, menuOpen]);

  useEffect(() => {
    if (!connectingId) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      loadStatus();
    }, 2000);
    return () => window.clearInterval(interval);
  }, [connectingId]);

  useEffect(() => {
    if (!connectingId || !statusById) {
      return;
    }
    if (statusById.get(connectingId)?.status === "connected") {
      onConnectionEnabledChange(connectingId, true);
      setConnectingId(null);
      setActionError(null);
    }
  }, [connectingId, onConnectionEnabledChange, statusById]);

  useEffect(() => {
    if (!statusById) {
      return;
    }
    for (const { key } of CONNECTION_ITEMS) {
      const status = statusById.get(key);
      if (enabledConnections[key] && status && status.status !== "connected") {
        onConnectionEnabledChange(key, false);
      }
    }
  }, [enabledConnections, onConnectionEnabledChange, statusById]);

  const startConnect = (connectionId: keyof EnabledConnections) => {
    setConnectingId(connectionId);
    setActionError(null);
    setMenuOpen(false);
    void (async () => {
      try {
        const { authorizeUrl } = await startConnectionAuthorize(connectionId);
        const safeUrl = getSafeAuthorizeUrl(authorizeUrl);
        if (!safeUrl) {
          throw new Error("Authorization URL cannot be opened.");
        }
        window.open(safeUrl, "_blank", "noopener,noreferrer");
      } catch (error) {
        setConnectingId(null);
        setActionError(error instanceof Error ? error.message : "Unable to start sign-in.");
      }
    })();
  };

  const startDisconnect = (connectionId: keyof EnabledConnections) => {
    setDisconnectingId(connectionId);
    setActionError(null);
    void (async () => {
      try {
        await disconnectConnection(connectionId);
        onConnectionEnabledChange(connectionId, false);
        loadStatus();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Unable to disconnect.");
      } finally {
        setDisconnectingId(null);
      }
    })();
  };

  return (
    <>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open);
          if (open) {
            loadStatus();
          } else {
            setActionError(null);
          }
        }}
      >
        <IconTooltip label="Tools" side="top">
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Tools"
              className="text-muted-foreground/65 hover:bg-background/45 hover:text-foreground focus-visible:bg-background/45 focus-visible:text-foreground dark:text-muted-foreground/55 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none [&_*]:cursor-pointer"
              onPointerDown={() => {
                loadStatus();
              }}
              type="button"
            >
              <HammerIcon className="size-4 shrink-0 cursor-pointer" />
            </button>
          </DropdownMenuTrigger>
        </IconTooltip>
        <DropdownMenuContent
          align="start"
          className="border-border bg-popover w-80 rounded-md p-1"
          sideOffset={4}
        >
          <p className="text-muted-foreground px-2 py-1.5 text-[11px] font-medium tracking-wide uppercase">
            Enable for this chat
          </p>
          {statusError ? (
            <p className="text-destructive px-2 py-1.5 text-xs" role="alert">
              {statusError}
            </p>
          ) : null}
          {actionError ? (
            <p className="text-destructive px-2 py-1.5 text-xs" role="alert">
              {actionError}
            </p>
          ) : null}
          {CONNECTION_ITEMS.map(({ Icon, key, label }) => {
            const enabled = enabledConnections[key];
            const status = statusById?.get(key);
            const statusText = integrationStatusText({
              loading: loadingStatus && !statusById,
              status,
              statusError,
            });
            const allowEnable = canEnableConnection(status);
            const adminSetupHint = connectionAdminSetupHint(status);
            const isConnecting = connectingId === key;
            const isDisconnecting = disconnectingId === key;

            return (
              <div className="hover:bg-muted/70 rounded-sm px-2 py-1.5" key={key}>
                <div className="flex items-center gap-2">
                  <span className="border-border bg-background flex size-7 shrink-0 items-center justify-center rounded-md border">
                    <Icon className="size-[18px]" />
                  </span>
                  <button
                    aria-checked={enabled}
                    aria-disabled={!enabled && !allowEnable}
                    aria-label={`${enabled ? "Disable" : "Enable"} ${label} for this chat`}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                    onClick={() => {
                      if (enabled) {
                        setActionError(null);
                        onConnectionEnabledChange(key, false);
                        return;
                      }
                      if (!allowEnable) {
                        setActionError(
                          status?.status === "needs_setup"
                            ? (adminSetupHint ?? `Set up ${label} first, then enable it.`)
                            : status?.status === "needs_sign_in"
                              ? `Connect ${label} first, then enable it.`
                              : `Wait for ${label} status, then enable it.`,
                        );
                        return;
                      }
                      setActionError(null);
                      onConnectionEnabledChange(key, true);
                    }}
                    role="menuitemcheckbox"
                    type="button"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="text-foreground block truncate text-sm">{label}</span>
                      <span
                        className={cn(
                          "mt-0.5 block truncate text-[11px]",
                          status?.status === "connected"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : status?.status === "needs_setup"
                              ? "text-destructive"
                              : "text-muted-foreground",
                        )}
                        title={adminSetupHint ?? status?.detail}
                      >
                        {isConnecting
                          ? "Waiting for sign-in…"
                          : isDisconnecting
                            ? "Disconnecting…"
                            : adminSetupHint
                              ? "Admin setup needed"
                              : statusText}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
                        enabled ? "bg-emerald-500" : "bg-muted",
                        !enabled && !allowEnable ? "opacity-50" : null,
                      )}
                    >
                      <span
                        className={cn(
                          "size-3 rounded-full bg-white shadow-sm transition-transform",
                          enabled ? "translate-x-[15px]" : "translate-x-0.5",
                        )}
                      />
                    </span>
                  </button>
                </div>
                <IntegrationsConnectionActions
                  connectionId={key}
                  isConnecting={isConnecting}
                  isDisconnecting={isDisconnecting}
                  onConfigure={() => {
                    setActionError(null);
                    setMenuOpen(false);
                    setConfigureId(key);
                  }}
                  onConnect={() => {
                    startConnect(key);
                  }}
                  onDisconnect={() => {
                    startDisconnect(key);
                  }}
                  status={status}
                />
              </div>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-sm px-2 py-1.5 text-sm">
            <Link
              href="/tools"
              onClick={() => {
                setMenuOpen(false);
              }}
            >
              <Settings2Icon className="size-4" />
              Manage tools
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConnectionSetupDialog
        connectionId={configureId}
        onOpenChange={(next) => {
          if (!next) {
            setConfigureId(null);
            loadStatus();
          }
        }}
        onSaved={() => {
          loadStatus();
        }}
        open={configureId !== null}
      />
    </>
  );
}
