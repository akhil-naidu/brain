"use client";

import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { HammerIcon } from "lucide-react";
import {
  AsanaIcon,
  ClickUpIcon,
  DflowIcon,
  GitHubIcon,
  GmailIcon,
  SlackIcon,
} from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EnabledConnections } from "@/app/_components/chat-shell-context";
import { ConnectionSetupDialog } from "@/components/chat/connection-setup-dialog";
import {
  connectionStatusLabel,
  disconnectConnection,
  fetchConnectionStatuses,
  getSafeAuthorizeUrl,
  startConnectionAuthorize,
  type ConnectionStatus,
} from "@/lib/chat/connections-status-api";
import { cn } from "@/lib/utils";

type ConnectionItem = {
  readonly key: keyof EnabledConnections;
  readonly label: string;
  readonly Icon: ComponentType<{ readonly className?: string }>;
};

const CONNECTION_ITEMS: readonly ConnectionItem[] = [
  { key: "clickup", label: "ClickUp", Icon: ClickUpIcon },
  { key: "slack", label: "Slack", Icon: SlackIcon },
  { key: "asana", label: "Asana", Icon: AsanaIcon },
  { key: "gmail", label: "Gmail", Icon: GmailIcon },
  { key: "dflow", label: "dFlow", Icon: DflowIcon },
  { key: "github", label: "GitHub", Icon: GitHubIcon },
];

export function integrationStatusText(input: {
  readonly loading: boolean;
  readonly status: ConnectionStatus | undefined;
  readonly statusError: string | null;
}): string {
  if (input.loading) {
    return "Checking…";
  }
  if (input.status) {
    return connectionStatusLabel(input.status.status);
  }
  if (input.statusError) {
    return "Status unavailable";
  }
  return "—";
}

export function shouldOfferConnectionConnect(status: ConnectionStatus | undefined): boolean {
  return status?.status === "needs_sign_in";
}

export function shouldOfferConnectionDisconnect(status: ConnectionStatus | undefined): boolean {
  return status?.status === "connected";
}

export function shouldOfferConnectionConfigure(status: ConnectionStatus | undefined): boolean {
  return status?.status === "needs_setup";
}

/** Users can only turn a connection on after it is signed in. */
export function canEnableConnection(status: ConnectionStatus | undefined): boolean {
  return status?.status === "connected";
}

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
  const [connectingId, setConnectingId] = useState<keyof EnabledConnections | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<keyof EnabledConnections | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
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
    if (!menuOpen) {
      return undefined;
    }

    const onFocus = () => {
      loadStatus();
    };
    window.addEventListener("focus", onFocus);

    const interval =
      connectingId === null
        ? undefined
        : window.setInterval(() => {
            loadStatus();
          }, 2000);

    return () => {
      window.removeEventListener("focus", onFocus);
      if (interval !== undefined) {
        window.clearInterval(interval);
      }
    };
  }, [menuOpen, connectingId]);

  useEffect(() => {
    if (!connectingId || !statusById) {
      return;
    }
    if (statusById.get(connectingId)?.status === "connected") {
      onConnectionEnabledChange(connectingId, true);
      setConnectingId(null);
      setConnectError(null);
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
    setConnectError(null);
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
        setConnectError(error instanceof Error ? error.message : "Unable to start sign-in.");
      }
    })();
  };

  const startDisconnect = (connectionId: keyof EnabledConnections) => {
    setDisconnectingId(connectionId);
    setConnectError(null);
    void (async () => {
      try {
        await disconnectConnection(connectionId);
        loadStatus();
      } catch (error) {
        setConnectError(error instanceof Error ? error.message : "Unable to disconnect.");
      } finally {
        setDisconnectingId(null);
      }
    })();
  };

  return (
    <DropdownMenu
      open={menuOpen}
      onOpenChange={(open) => {
        setMenuOpen(open);
        if (open) {
          loadStatus();
        } else {
          setConnectError(null);
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Connections"
          className="text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground focus-visible:bg-muted/50 focus-visible:text-foreground dark:text-muted-foreground/50 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:outline-none [&_*]:cursor-pointer"
          onPointerDown={() => {
            loadStatus();
          }}
          type="button"
        >
          <HammerIcon className="size-4 shrink-0 cursor-pointer" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="border-border bg-popover w-72 rounded-md p-1"
        sideOffset={4}
      >
        {statusError ? (
          <p className="text-destructive px-2 py-1.5 text-xs" role="alert">
            {statusError}
          </p>
        ) : null}
        {connectError ? (
          <p className="text-destructive px-2 py-1.5 text-xs" role="alert">
            {connectError}
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
          const showConnect = shouldOfferConnectionConnect(status);
          const showDisconnect = shouldOfferConnectionDisconnect(status);
          const showConfigure = shouldOfferConnectionConfigure(status);
          const allowEnable = canEnableConnection(status);
          const isConnecting = connectingId === key;
          const isDisconnecting = disconnectingId === key;

          return (
            <DropdownMenuItem
              aria-checked={enabled}
              aria-disabled={!enabled && !allowEnable}
              className="focus:bg-muted/70 h-auto cursor-pointer gap-2 rounded-sm px-2 py-1.5 text-sm"
              key={key}
              onSelect={(event) => {
                event.preventDefault();
                const target = event.target;
                if (
                  target instanceof Element &&
                  target.closest(
                    "[data-connection-connect], [data-connection-disconnect], [data-connection-configure]",
                  )
                ) {
                  return;
                }
                if (enabled) {
                  onConnectionEnabledChange(key, false);
                  return;
                }
                if (!allowEnable) {
                  setConnectError(
                    status?.status === "needs_setup"
                      ? `Ask the host operator to set up ${label}, then connect it.`
                      : status?.status === "needs_sign_in"
                        ? `Connect ${label} before turning it on.`
                        : `Wait for ${label} status, then connect it.`,
                  );
                  return;
                }
                onConnectionEnabledChange(key, true);
              }}
              role="menuitemcheckbox"
            >
              <span className="border-border bg-background flex size-7 shrink-0 items-center justify-center rounded-md border">
                <Icon className="size-[18px]" />
              </span>
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
                  title={status?.detail}
                >
                  {isConnecting
                    ? "Waiting for sign-in…"
                    : isDisconnecting
                      ? "Disconnecting…"
                      : statusText}
                </span>
              </span>
              {showConfigure ? (
                <button
                  className="border-border bg-background text-foreground hover:bg-muted inline-flex h-6 shrink-0 items-center rounded-md border px-1.5 text-[11px] font-medium"
                  data-connection-configure
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setConnectError(null);
                    setMenuOpen(false);
                    setConfigureId(key);
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  type="button"
                >
                  Set up
                </button>
              ) : null}
              {showConnect ? (
                <button
                  className="border-border bg-background text-foreground hover:bg-muted inline-flex h-6 shrink-0 items-center rounded-md border px-1.5 text-[11px] font-medium"
                  data-connection-connect
                  disabled={isConnecting}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    startConnect(key);
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  type="button"
                >
                  Connect
                </button>
              ) : null}
              {showDisconnect ? (
                <button
                  className="border-border bg-background text-foreground hover:bg-muted inline-flex h-6 shrink-0 items-center rounded-md border px-1.5 text-[11px] font-medium"
                  data-connection-disconnect
                  disabled={isDisconnecting}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    startDisconnect(key);
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  type="button"
                >
                  Disconnect
                </button>
              ) : null}
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
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
      <ConnectionSetupDialog
        connectionId={configureId}
        onOpenChange={(next) => {
          if (!next) {
            setConfigureId(null);
          }
        }}
        onSaved={() => {
          loadStatus();
        }}
        open={configureId !== null}
      />
    </DropdownMenu>
  );
}
