"use client";

import { useCallback, useEffect, useState } from "react";
import { useChatShell } from "@/app/_components/chat-shell-context";
import type { EnabledConnections } from "@/app/_components/chat-shell-context";
import { ConnectionSetupDialog } from "@/components/chat/connection-setup-dialog";
import { WorkspaceByoaSection } from "@/components/chat/workspace-byoa-section";
import { SettingsCardsSkeleton } from "@/components/loading/skeletons";
import {
  SettingsBadge,
  SettingsPanel,
  SettingsSection,
  SettingsShell,
  SettingsTabs,
} from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CONNECTION_ITEMS } from "@/lib/chat/connection-catalog";
import {
  canEnableConnection,
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
import { useTabSearchParam } from "@/lib/navigation/use-tab-search-param";
import { cn } from "@/lib/utils";

const TOOLS_TABS = ["mcp", "workspace-apps"] as const;

export function ToolsPage() {
  const { enabledConnections, setConnectionEnabled } = useChatShell();
  const [tab, setTab] = useTabSearchParam({
    defaultTab: "mcp",
    tabs: TOOLS_TABS,
  });
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
      <SettingsTabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "mcp", label: "MCP connections" },
          { id: "workspace-apps", label: "Workspace apps" },
        ]}
      />

      {statusError || actionError ? (
        <p className="text-destructive text-sm" role="alert">
          {actionError ?? statusError}
        </p>
      ) : null}

      {tab === "mcp" ? (
        <>
          <SettingsSection description="Connect once, then enable a tool when you want it available for the next chat turn.">
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
                  const showConfigure = shouldOfferConnectionConfigure(status);
                  const allowEnable = canEnableConnection(status);
                  const isConnecting = connectingId === key;
                  const isDisconnecting = disconnectingId === key;

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
                            </div>
                            <p className="text-muted-foreground text-xs leading-relaxed">
                              {description}
                            </p>
                            {status?.detail ? (
                              <p className="text-muted-foreground/80 text-[11px]">
                                {status.detail}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                          {showConfigure ? (
                            <Button
                              onClick={() => {
                                setActionError(null);
                                setConfigureId(key);
                              }}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              Set up
                            </Button>
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
                            <Button
                              disabled={isDisconnecting}
                              onClick={() => {
                                startDisconnect(key);
                              }}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              Disconnect
                            </Button>
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
                                      ? `Set up ${label} app credentials first (Set up or Workspace apps), then connect it.`
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
                    </SettingsPanel>
                  );
                })}
              </div>
            )}
          </SettingsSection>

          <SettingsSection
            description="Tools loaded from MCP apps you have connected in this workspace — browse without starting a chat."
            title="Loaded tools"
          >
            {catalogError ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-destructive text-sm" role="alert">
                  {catalogError}
                </p>
                <Button onClick={() => loadCatalog()} size="sm" type="button" variant="outline">
                  Retry
                </Button>
              </div>
            ) : null}
            {loadingCatalog && !catalog ? <SettingsCardsSkeleton cards={2} /> : null}
            {!loadingCatalog && catalog && catalog.connections.length === 0 ? (
              <SettingsPanel className="p-4">
                <p className="text-muted-foreground text-sm">
                  No connected MCP apps yet. Connect an app above, then the tools it exposes will
                  appear here.
                </p>
              </SettingsPanel>
            ) : null}
            {catalog && catalog.connections.length > 0 ? (
              <div className="grid gap-3">
                {catalog.connections.map((connection) => (
                  <SettingsPanel className="p-4" key={connection.connectionId}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{connection.connectionName}</p>
                      <SettingsBadge>
                        {connection.error
                          ? "Unavailable"
                          : `${connection.tools.length} tool${connection.tools.length === 1 ? "" : "s"}`}
                      </SettingsBadge>
                    </div>
                    {connection.error ? (
                      <p className="text-destructive text-xs" role="alert">
                        {connection.error}
                      </p>
                    ) : connection.tools.length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        Connected, but this app did not return any tools.
                      </p>
                    ) : (
                      <ul className="divide-border/70 divide-y rounded-lg border">
                        {connection.tools.map((tool) => (
                          <li
                            className="px-3 py-2.5"
                            key={`${connection.connectionId}:${tool.name}`}
                          >
                            <p className="font-mono text-xs font-medium">{tool.name}</p>
                            {tool.description ? (
                              <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                                {tool.description}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </SettingsPanel>
                ))}
              </div>
            ) : null}
          </SettingsSection>
        </>
      ) : null}

      {tab === "workspace-apps" ? <WorkspaceByoaSection /> : null}

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
