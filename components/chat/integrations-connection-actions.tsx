"use client";

import {
  connectionConfigureLabel,
  shouldOfferConnectionConfigure,
  shouldOfferConnectionConnect,
  shouldOfferConnectionDisconnect,
} from "@/lib/chat/connection-ui";
import type { ConnectionStatus } from "@/lib/chat/connections-status-api";

export function IntegrationsConnectionActions({
  connectionId,
  status,
  isConnecting,
  isDisconnecting,
  onConfigure,
  onConnect,
  onDisconnect,
}: {
  readonly connectionId: string;
  readonly status: ConnectionStatus | undefined;
  readonly isConnecting: boolean;
  readonly isDisconnecting: boolean;
  readonly onConfigure: () => void;
  readonly onConnect: () => void;
  readonly onDisconnect: () => void;
}) {
  const showConfigure = shouldOfferConnectionConfigure(status, connectionId);
  const showConnect = shouldOfferConnectionConnect(status);
  const showDisconnect = shouldOfferConnectionDisconnect(status);

  if (!showConfigure && !showConnect && !showDisconnect) {
    return null;
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-1 pl-9">
      {showConfigure ? (
        <button
          className="text-muted-foreground hover:text-foreground hover:bg-background/80 rounded px-1.5 py-0.5 text-[11px] font-medium"
          onClick={onConfigure}
          type="button"
        >
          {connectionConfigureLabel(status)}
        </button>
      ) : null}
      {showConnect ? (
        <button
          className="text-primary hover:bg-background/80 rounded px-1.5 py-0.5 text-[11px] font-medium"
          disabled={isConnecting}
          onClick={onConnect}
          type="button"
        >
          {isConnecting ? "Connecting…" : "Connect"}
        </button>
      ) : null}
      {showDisconnect ? (
        <button
          className="text-muted-foreground hover:text-foreground hover:bg-background/80 rounded px-1.5 py-0.5 text-[11px] font-medium"
          disabled={isDisconnecting}
          onClick={onDisconnect}
          type="button"
        >
          {isDisconnecting ? "Disconnecting…" : "Disconnect"}
        </button>
      ) : null}
    </div>
  );
}
