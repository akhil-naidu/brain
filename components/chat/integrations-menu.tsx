"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HammerIcon, Settings2Icon } from "lucide-react";
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
import { canEnableConnection, integrationStatusText } from "@/lib/chat/connection-ui";
import { fetchConnectionStatuses, type ConnectionStatus } from "@/lib/chat/connections-status-api";
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
  const [toggleError, setToggleError] = useState<string | null>(null);

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
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [menuOpen]);

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

  return (
    <DropdownMenu
      open={menuOpen}
      onOpenChange={(open) => {
        setMenuOpen(open);
        if (open) {
          loadStatus();
        } else {
          setToggleError(null);
        }
      }}
    >
      <IconTooltip label="Tools" side="top">
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Tools"
            className="text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground focus-visible:bg-muted/50 focus-visible:text-foreground dark:text-muted-foreground/50 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:outline-none [&_*]:cursor-pointer"
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
        className="border-border bg-popover w-72 rounded-md p-1"
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
        {toggleError ? (
          <p className="text-destructive px-2 py-1.5 text-xs" role="alert">
            {toggleError}
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

          return (
            <DropdownMenuItem
              aria-checked={enabled}
              aria-disabled={!enabled && !allowEnable}
              className="focus:bg-muted/70 h-auto cursor-pointer gap-2 rounded-sm px-2 py-1.5 text-sm"
              key={key}
              onSelect={(event) => {
                event.preventDefault();
                if (enabled) {
                  setToggleError(null);
                  onConnectionEnabledChange(key, false);
                  return;
                }
                if (!allowEnable) {
                  setToggleError(
                    status?.status === "needs_setup"
                      ? `Set up ${label} on the Tools page first.`
                      : status?.status === "needs_sign_in"
                        ? `Connect ${label} on the Tools page first.`
                        : `Wait for ${label} status, then manage it on Tools.`,
                  );
                  return;
                }
                setToggleError(null);
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
                  {statusText}
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
            </DropdownMenuItem>
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
  );
}
