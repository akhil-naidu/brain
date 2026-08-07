"use client";

import { useCallback, useEffect, useState } from "react";
import { Settings2Icon, UnplugIcon } from "lucide-react";
import { useChatShell } from "@/app/_components/chat-shell-context";
import type { EnabledConnections } from "@/app/_components/chat-shell-context";
import { ConnectionSetupDialog } from "@/components/chat/connection-setup-dialog";
import { SettingsCardsSkeleton } from "@/components/loading/skeletons";
import {
  SettingsBadge,
  SettingsPanel,
  SettingsSection,
  SettingsShell,
} from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { IconTooltip } from "@/components/ui/tooltip";
import { CONNECTION_ITEMS } from "@/lib/chat/connection-catalog";
import {
  canEnableConnection,
  connectionAdminSetupHint,
  connectionConfigureLabel,
  integrationStatusText,
  shouldOfferConnectionConfigure,
  shouldOfferConnectionConnect,
  shouldOfferConnectionDisconnect,
} from "@/lib/chat/connection-ui";
import {
  disconnectConnection,
  fetchConnectionStatuses,
  getSafeAuthorizeUrl,
  startConnectionAuthorize,
  type ConnectionStatus,
} from "@/lib/chat/connections-status-api";
import {
  fetchMcpToolsCatalog,
  type McpToolsCatalogResponse,
} from "@/lib/chat/connections-tools-api";
import { cn } from "@/lib/utils";

export function ToolsPage() {
  const { enabledConnections, setConnectionEnabled } = useChatShell();
  const [statusById, setStatusById] = useState<ReadonlyMap<string, ConnectionStatus> | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [catalog, setCatalog] = useState<McpToolsCatalogResponse | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [connectingId, setConnectingId] = useState<keyof EnabledConnections | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<keyof EnabledConnections | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [configureId, setConfigureId] = useState<string | null>(null);

  const loadCatalog = useCallback(() => {
    setLoadingCatalog(true);
    setCatalogError(null);
    void (async () => {
      try {
        const next = await fetchMcpToolsCatalog();
        setCatalog(next);
      } catch (error) {
        setCatalog(null);
        setCatalogError(
          error instanceof Error ? error.message : "Unable to load MCP tools catalog.",
        );
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, []);

  const loadStatus = useCallback(() => {
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
  }, []);

  const refreshToolsPage = useCallback(() => {
    loadStatus();
    loadCatalog();
  }, [loadCatalog, loadStatus]);

  useEffect(() => {
    refreshToolsPage();
    const onFocus = () => {
      refreshToolsPage();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshToolsPage]);

  useEffect(() => {
    if (!connectingId) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      refreshToolsPage();
    }, 2000);
    return () => window.clearInterval(interval);
  }, [connectingId, refreshToolsPage]);

  useEffect(() => {
    if (!connectingId || !statusById) {
      return;
    }
    if (statusById.get(connectingId)?.status === "connected") {
      setConnectionEnabled(connectingId, true);
      setConnectingId(null);
      setActionError(null);
      loadCatalog();
    }
  }, [connectingId, loadCatalog, setConnectionEnabled, statusById]);

  useEffect(() => {
    if (!statusById) {
      return;
    }
    for (const { key } of CONNECTION_ITEMS) {
      const status = statusById.get(key);
      if (enabledConnections[key] && status && status.status !== "connected") {
        setConnectionEnabled(key, false);
      }
    }
  }, [enabledConnections, setConnectionEnabled, statusById]);

  const startConnect = (connectionId: keyof EnabledConnections) => {
    setConnectingId(connectionId);
    setActionError(null);
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
        setConnectionEnabled(connectionId, false);
        refreshToolsPage();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Unable to disconnect.");
      } finally {
        setDisconnectingId(null);
      }
    })();
  };

  const connectedCount = CONNECTION_ITEMS.filter(
    (item) => statusById?.get(item.key)?.status === "connected",
  ).length;

  return (
    <SettingsShell
      description="Connect MCP apps and choose which tools Brain can use in chat."
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <SettingsBadge>
            {loadingStatus ? "Checking connections" : `${connectedCount} connected`}
          </SettingsBadge>
          <SettingsBadge>
            {CONNECTION_ITEMS.filter((item) => enabledConnections[item.key]).length} enabled in chat
          </SettingsBadge>
        </div>
      }
      title="Tools"
    >
      {statusError || actionError ? (
        <p className="text-destructive text-sm" role="alert">
          {actionError ?? statusError}
        </p>
      ) : null}

      <SettingsSection description="Connect once, then enable a tool when you want it available for the next chat turn.">
        {catalogError ? (
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <p className="text-destructive text-sm" role="alert">
              {catalogError}
            </p>
            <Button onClick={() => loadCatalog()} size="sm" type="button" variant="outline">
              Retry tools
            </Button>
          </div>
        ) : null}
        {loadingStatus && !statusById ? (
          <SettingsCardsSkeleton cards={CONNECTION_ITEMS.length} />
        ) : (
          <div className="grid gap-3">
            {CONNECTION_ITEMS.map(({ Icon, description, key, label }) => {
              const enabled = enabledConnections[key];
              const status = statusById?.get(key);
              const statusText = integrationStatusText({
                loading: loadingStatus && !statusById,
                status,
                statusError,
              });
              const showConnect = shouldOfferConnectionConnect(status);
              const showDisconnect = shouldOfferConnectionDisconnect(status);
              const showConfigure = shouldOfferConnectionConfigure(status, key);
              const adminSetupHint = connectionAdminSetupHint(status);
              const allowEnable = canEnableConnection(status);
              const isConnecting = connectingId === key;
              const isDisconnecting = disconnectingId === key;
              const catalogEntry = catalog?.connections.find(
                (connection) => connection.connectionId === key,
              );
              const isConnected = status?.status === "connected";

              return (
                <SettingsPanel className="p-4" key={key}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="border-border bg-background flex size-10 shrink-0 items-center justify-center rounded-xl border">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{label}</p>
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                              status?.status === "connected"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : status?.status === "needs_setup"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {isConnecting
                              ? "Waiting for sign-in…"
                              : isDisconnecting
                                ? "Disconnecting…"
                                : statusText}
                          </span>
                          {isConnected && catalogEntry && !catalogEntry.error ? (
                            <SettingsBadge>
                              {`${catalogEntry.tools.length} tool${catalogEntry.tools.length === 1 ? "" : "s"}`}
                            </SettingsBadge>
                          ) : null}
                        </div>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {description}
                        </p>
                        {adminSetupHint ? (
                          <p className="text-muted-foreground/90 text-[11px]">{adminSetupHint}</p>
                        ) : status?.detail ? (
                          <p className="text-muted-foreground/80 text-[11px]">{status.detail}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                      {showConfigure ? (
                        <IconTooltip label={connectionConfigureLabel(status)} side="bottom">
                          <Button
                            aria-label={connectionConfigureLabel(status)}
                            onClick={() => {
                              setActionError(null);
                              setConfigureId(key);
                            }}
                            size="icon-sm"
                            type="button"
                            variant="outline"
                          >
                            <Settings2Icon />
                          </Button>
                        </IconTooltip>
                      ) : null}
                      {showConnect ? (
                        <Button
                          disabled={isConnecting}
                          onClick={() => {
                            startConnect(key);
                          }}
                          size="sm"
                          type="button"
                        >
                          {isConnecting ? "Connecting…" : "Connect"}
                        </Button>
                      ) : null}
                      {showDisconnect ? (
                        <IconTooltip
                          label={isDisconnecting ? "Disconnecting…" : "Disconnect"}
                          side="bottom"
                        >
                          <Button
                            aria-label={isDisconnecting ? "Disconnecting…" : "Disconnect"}
                            disabled={isDisconnecting}
                            onClick={() => {
                              startDisconnect(key);
                            }}
                            size="icon-sm"
                            type="button"
                            variant="outline"
                          >
                            <UnplugIcon />
                          </Button>
                        </IconTooltip>
                      ) : null}
                      <div className="border-border/70 flex items-center gap-2 rounded-lg border px-2.5 py-1.5">
                        <span className="text-muted-foreground text-xs">In chat</span>
                        <Switch
                          checked={enabled}
                          disabled={!enabled && !allowEnable}
                          onCheckedChange={(checked) => {
                            if (checked && !allowEnable) {
                              setActionError(
                                status?.status === "needs_setup"
                                  ? adminSetupHint
                                    ? adminSetupHint
                                    : `Set up ${label} with App settings, then connect it.`
                                  : status?.status === "needs_sign_in"
                                    ? `Connect ${label} before turning it on.`
                                    : `Wait for ${label} status, then connect it.`,
                              );
                              return;
                            }
                            setActionError(null);
                            setConnectionEnabled(key, checked);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {isConnected ? (
                    <div className="border-border/60 mt-4 border-t pt-3">
                      {loadingCatalog && !catalogEntry ? (
                        <p className="text-muted-foreground text-xs">Loading tools…</p>
                      ) : catalogEntry?.error ? (
                        <p className="text-destructive text-xs" role="alert">
                          {catalogEntry.error}
                        </p>
                      ) : catalogEntry && catalogEntry.tools.length > 0 ? (
                        <ul className="flex flex-wrap gap-1.5">
                          {catalogEntry.tools.map((tool) => (
                            <li key={`${key}:${tool.name}`}>
                              <span
                                className="bg-muted text-muted-foreground inline-flex max-w-full items-center rounded-md px-2 py-1 font-mono text-[11px]"
                                title={tool.description || tool.name}
                              >
                                <span className="truncate">{tool.name}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground text-xs">
                          Connected, but this app did not return any tools.
                        </p>
                      )}
                    </div>
                  ) : null}
                </SettingsPanel>
              );
            })}
          </div>
        )}
      </SettingsSection>

      <ConnectionSetupDialog
        connectionId={configureId}
        onOpenChange={(next) => {
          if (!next) {
            setConfigureId(null);
          }
        }}
        onSaved={() => {
          refreshToolsPage();
        }}
        open={configureId !== null}
      />
    </SettingsShell>
  );
}
