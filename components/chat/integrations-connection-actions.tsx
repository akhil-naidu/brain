"use client";

import { Settings2Icon, UnplugIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconTooltip } from "@/components/ui/tooltip";
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

  const configureLabel = connectionConfigureLabel(status);

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-9">
      {showConfigure ? (
        <IconTooltip label={configureLabel} side="bottom">
          <Button
            aria-label={configureLabel}
            className="text-muted-foreground"
            onClick={onConfigure}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <Settings2Icon />
          </Button>
        </IconTooltip>
      ) : null}
      {showConnect ? (
        <Button
          disabled={isConnecting}
          onClick={onConnect}
          size="xs"
          type="button"
          variant="outline"
        >
          {isConnecting ? "Connecting…" : "Connect"}
        </Button>
      ) : null}
      {showDisconnect ? (
        <IconTooltip label={isDisconnecting ? "Disconnecting…" : "Disconnect"} side="bottom">
          <Button
            aria-label={isDisconnecting ? "Disconnecting…" : "Disconnect"}
            className="text-muted-foreground"
            disabled={isDisconnecting}
            onClick={onDisconnect}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <UnplugIcon />
          </Button>
        </IconTooltip>
      ) : null}
    </div>
  );
}
