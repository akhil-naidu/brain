"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HammerIcon, ListIcon, Settings2Icon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconTooltip } from "@/components/ui/tooltip";
import type { EnabledConnections } from "@/app/_components/chat-shell-context";
import { CONNECTION_ITEMS } from "@/lib/chat/connection-catalog";
import { canEnableConnection, integrationStatusText } from "@/lib/chat/connection-ui";
import { fetchConnectionStatuses, type ConnectionStatus } from "@/lib/chat/connections-status-api";
import {
  fetchMcpToolsCatalog,
  type McpToolsCatalogResponse,
} from "@/lib/chat/connections-tools-api";
import { showToast } from "@/lib/ui/toast-store";
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
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusById, setStatusById] = useState<ReadonlyMap<string, ConnectionStatus> | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [catalog, setCatalog] = useState<McpToolsCatalogResponse | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [toolsPopoverId, setToolsPopoverId] = useState<string | null>(null);

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

  const loadCatalog = () => {
    setLoadingCatalog(true);
    void (async () => {
      try {
        const next = await fetchMcpToolsCatalog();
        setCatalog(next);
      } catch {
        setCatalog(null);
      } finally {
        setLoadingCatalog(false);
      }
    })();
  };

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const onFocus = () => {
      loadStatus();
      loadCatalog();
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

  const toggleConnection = (key: keyof EnabledConnections, label: string) => {
    const enabled = enabledConnections[key];
    const status = statusById?.get(key);
    const allowEnable = canEnableConnection(status);
    if (enabled) {
      onConnectionEnabledChange(key, false);
      return;
    }
    if (allowEnable) {
      onConnectionEnabledChange(key, true);
      return;
    }
    // Set up / Connect live on Tools — keep the chat menu enable-only.
    setMenuOpen(false);
    if (status?.status === "needs_setup") {
      showToast({
        title: "Set up required",
        message: `Set up ${label} on Tools, then enable it for chat.`,
        variant: "info",
      });
    } else if (status?.status === "needs_sign_in") {
      showToast({
        title: "Connect required",
        message: `Connect ${label} on Tools, then enable it for chat.`,
        variant: "info",
      });
    } else {
      showToast({
        title: "Manage on Tools",
        message: `Finish setting up ${label} on Tools.`,
        variant: "info",
      });
    }
    router.push(`/tools?focus=${encodeURIComponent(key)}`);
  };

  return (
    <DropdownMenu
      open={menuOpen}
      onOpenChange={(open) => {
        setMenuOpen(open);
        if (open) {
          loadStatus();
          loadCatalog();
        } else {
          setToolsPopoverId(null);
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
              loadCatalog();
            }}
            type="button"
          >
            <HammerIcon className="size-4 shrink-0 cursor-pointer" />
          </button>
        </DropdownMenuTrigger>
      </IconTooltip>
      <DropdownMenuContent
        align="start"
        className="border-border bg-popover max-h-[min(28rem,70vh)] w-80 overflow-y-auto rounded-md p-1"
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
        {CONNECTION_ITEMS.map(({ Icon, key, label }) => {
          const enabled = enabledConnections[key];
          const status = statusById?.get(key);
          const statusText = integrationStatusText({
            loading: loadingStatus && !statusById,
            status,
            statusError,
          });
          const allowEnable = canEnableConnection(status);
          const catalogEntry = catalog?.connections.find((entry) => entry.connectionId === key);
          const isConnected = status?.status === "connected";
          const toolCount = catalogEntry && !catalogEntry.error ? catalogEntry.tools.length : null;
          const toolsLabel =
            loadingCatalog && !catalogEntry
              ? `Loading ${label} tools`
              : toolCount === null
                ? `${label} tools`
                : `${label} tools (${toolCount})`;

          return (
            <div
              className="hover:bg-muted/70 flex items-center gap-1 rounded-sm px-2 py-1.5"
              key={key}
            >
              <button
                aria-checked={enabled}
                aria-disabled={!enabled && !allowEnable}
                aria-label={`${enabled ? "Disable" : "Enable"} ${label} for this chat`}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                onClick={() => {
                  toggleConnection(key, label);
                }}
                role="menuitemcheckbox"
                type="button"
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
              </button>
              {isConnected ? (
                <Popover
                  onOpenChange={(open) => {
                    setToolsPopoverId(open ? key : null);
                  }}
                  open={toolsPopoverId === key}
                >
                  <IconTooltip label={toolsLabel} side="top">
                    <PopoverTrigger asChild>
                      <button
                        aria-label={toolsLabel}
                        className={cn(
                          "text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors",
                          toolsPopoverId === key ? "bg-muted text-foreground" : null,
                        )}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                        }}
                        type="button"
                      >
                        <ListIcon className="size-3.5" />
                      </button>
                    </PopoverTrigger>
                  </IconTooltip>
                  <PopoverContent
                    align="start"
                    className="w-64 p-2"
                    onOpenAutoFocus={(event) => {
                      event.preventDefault();
                    }}
                    side="right"
                    sideOffset={8}
                  >
                    <p className="text-muted-foreground px-1 pb-1.5 text-[11px] font-medium tracking-wide uppercase">
                      {label} tools
                    </p>
                    {loadingCatalog && !catalogEntry ? (
                      <p className="text-muted-foreground px-1 text-xs">Loading tools…</p>
                    ) : catalogEntry?.error ? (
                      <p className="text-destructive px-1 text-xs" role="alert">
                        {catalogEntry.error}
                      </p>
                    ) : catalogEntry && catalogEntry.tools.length > 0 ? (
                      <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
                        {catalogEntry.tools.map((tool) => (
                          <li key={`${key}:${tool.name}`}>
                            <span
                              className="text-foreground block truncate rounded-md px-1 py-0.5 font-mono text-[11px]"
                              title={tool.description || tool.name}
                            >
                              {tool.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground px-1 text-xs">No tools returned</p>
                    )}
                  </PopoverContent>
                </Popover>
              ) : null}
              <button
                aria-checked={enabled}
                aria-disabled={!enabled && !allowEnable}
                aria-label={`${enabled ? "Disable" : "Enable"} ${label} for this chat`}
                className="inline-flex shrink-0 cursor-pointer items-center"
                onClick={() => {
                  toggleConnection(key, label);
                }}
                role="switch"
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
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
